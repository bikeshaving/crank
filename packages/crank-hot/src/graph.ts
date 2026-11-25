import {createHash} from "node:crypto";
import {existsSync, readFileSync, statSync} from "node:fs";
import {dirname, extname, join, resolve as resolvePath} from "node:path";
import ts from "typescript";

// For development servers which evaluate a whole new bundle when a file
// changes. Every module is evaluated again, so a value such as a store would
// be made again with every edit, and a component whose setup used it would
// be remounted.
//
// This gives every top-level binding of the app a hash of its source and of
// the hashes of the bindings it refers to. A binding whose hash is what it
// was in the last bundle keeps its value. A component is the same function
// through every edit, so a reference to one is never a change.

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs"];

const SCRIPT_KINDS: Record<string, ts.ScriptKind> = {
	".ts": ts.ScriptKind.TS,
	".mts": ts.ScriptKind.TS,
	".tsx": ts.ScriptKind.TSX,
	".js": ts.ScriptKind.JS,
	".mjs": ts.ScriptKind.JS,
	".jsx": ts.ScriptKind.JSX,
};

/** Something at the top level of a module which has a value. */
interface Entity {
	names: Array<string>;
	text: string;
	refs: Set<string>;
	// A component, which is not a change to what refers to it.
	isStable: boolean;
	// Something which is made again with every bundle: a variable which can
	// be assigned to, or what a top-level await is for.
	isFresh: boolean;
	deps: Set<Entity>;
	hash: string;
	// For finding the entities which refer to each other.
	index: number;
	low: number;
	onStack: boolean;
}

interface Module {
	file: string;
	names: Map<string, Entity>;
	entities: Array<Entity>;
	// For references which cannot be followed to a declaration.
	whole: Entity;
	imports: Map<string, {file: string; name: string}>;
	exports: Map<string, string>;
	reexports: Map<string, {file: string; name: string}>;
	links: Array<string>;
	packages: Array<string>;
}

export interface Graph {
	/** The hash of each top-level name of each module, by path. */
	hashes: Map<string, Map<string, string>>;
	/** The packages which the app imports. */
	packages: Array<string>;
}

function hash(text: string): string {
	return createHash("sha1").update(text).digest("base64url").slice(0, 12);
}

function isFile(path: string): boolean {
	return existsSync(path) && statSync(path).isFile();
}

function resolveRelative(spec: string, from: string): string | undefined {
	const base = resolvePath(dirname(from), spec);
	const candidates = [base];
	const ext = extname(base);
	if (ext === ".js" || ext === ".jsx") {
		const stem = base.slice(0, -ext.length);
		candidates.push(stem + ".ts", stem + ".tsx");
	}

	for (const e of EXTENSIONS) {
		candidates.push(base + e);
	}

	for (const e of EXTENSIONS) {
		candidates.push(join(base, "index" + e));
	}

	return candidates.find(
		(path) => EXTENSIONS.includes(extname(path)) && isFile(path),
	);
}

function hasAwait(node: ts.Node): boolean {
	if (ts.isAwaitExpression(node)) {
		return true;
	} else if (ts.isFunctionLike(node)) {
		return false;
	}

	return !!ts.forEachChild(node, hasAwait);
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
	const modifiers = (node as any).modifiers as
		| ts.NodeArray<ts.Modifier>
		| undefined;
	return !!modifiers && modifiers.some((m) => m.kind === kind);
}

function getBindingNames(name: ts.BindingName, names: Array<string>): void {
	if (ts.isIdentifier(name)) {
		names.push(name.text);
	} else {
		for (const el of name.elements) {
			if (!ts.isOmittedExpression(el)) {
				getBindingNames(el.name, names);
			}
		}
	}
}

function createEntity(names: Array<string>, text: string): Entity {
	return {
		names,
		text,
		refs: new Set(),
		isStable: false,
		isFresh: false,
		deps: new Set(),
		hash: "",
		index: -1,
		low: -1,
		onStack: false,
	};
}

/**
 * Collects the names which a node refers to. Shadowing is ignored, which can
 * only make something depend on more than it does.
 */
function collectRefs(refs: Set<string>, node: ts.Node): void {
	if (ts.isIdentifier(node)) {
		const parent = node.parent as any;
		if (parent.name !== node || ts.isShorthandPropertyAssignment(parent)) {
			refs.add(node.text);
		}
	}

	ts.forEachChild(node, (child) => collectRefs(refs, child));
}

function link(mod: Module, node: ts.Expression): string | undefined {
	const spec = (node as ts.StringLiteral).text;
	if (spec.startsWith(".")) {
		const target = resolveRelative(spec, mod.file);
		if (target) {
			mod.links.push(target);
		}

		return target;
	} else if (!spec.startsWith("/")) {
		mod.packages.push(spec);
	}

	return undefined;
}

function parse(file: string): Module {
	const source = readFileSync(file, "utf8");
	const sf = ts.createSourceFile(
		file,
		source,
		ts.ScriptTarget.Latest,
		true,
		SCRIPT_KINDS[extname(file)],
	);
	const mod: Module = {
		file,
		names: new Map(),
		entities: [],
		whole: createEntity(["*"], source),
		imports: new Map(),
		exports: new Map(),
		reexports: new Map(),
		links: [],
		packages: [],
	};

	const add = (names: Array<string>, text: string): Entity => {
		const entity = createEntity(names, text);
		mod.entities.push(entity);
		for (const name of names) {
			mod.names.set(name, entity);
		}

		return entity;
	};

	for (const stmt of sf.statements) {
		const isExport = hasModifier(stmt, ts.SyntaxKind.ExportKeyword);
		const isDefault = hasModifier(stmt, ts.SyntaxKind.DefaultKeyword);
		if (ts.isImportDeclaration(stmt)) {
			const clause = stmt.importClause;
			if (clause && clause.isTypeOnly) {
				continue;
			}

			const target = link(mod, stmt.moduleSpecifier);
			if (!clause || !target) {
				continue;
			}

			if (clause.name) {
				mod.imports.set(clause.name.text, {file: target, name: "default"});
			}

			const bindings = clause.namedBindings;
			if (bindings && ts.isNamespaceImport(bindings)) {
				mod.imports.set(bindings.name.text, {file: target, name: "*"});
			} else if (bindings) {
				for (const el of bindings.elements) {
					mod.imports.set(el.name.text, {
						file: target,
						name: (el.propertyName || el.name).text,
					});
				}
			}
		} else if (ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) {
			if (ts.isFunctionDeclaration(stmt) && !stmt.body) {
				// An overload signature.
				continue;
			}

			const name = stmt.name ? stmt.name.text : "default";
			const entity = add([name], stmt.getText(sf));
			// The same functions which the transform registers as components.
			entity.isStable =
				ts.isFunctionDeclaration(stmt) && (!stmt.name || /^[A-Z]/.test(name));
			ts.forEachChild(stmt, (child) => collectRefs(entity.refs, child));
			if (isExport) {
				mod.exports.set(isDefault ? "default" : name, name);
			}
		} else if (ts.isVariableStatement(stmt)) {
			const isConst = !!(stmt.declarationList.flags & ts.NodeFlags.Const);
			for (const decl of stmt.declarationList.declarations) {
				const names: Array<string> = [];
				getBindingNames(decl.name, names);
				const entity = add(names, decl.getText(sf));
				const init = decl.initializer;
				entity.isFresh = !isConst || (!!init && hasAwait(init));
				entity.isStable =
					isConst &&
					!!init &&
					ts.isIdentifier(decl.name) &&
					/^[A-Z]/.test(decl.name.text) &&
					(ts.isArrowFunction(init) || ts.isFunctionExpression(init));
				collectRefs(entity.refs, decl);
				if (isExport) {
					for (const name of names) {
						mod.exports.set(name, name);
					}
				}
			}
		} else if (ts.isExportAssignment(stmt) && !stmt.isExportEquals) {
			const expression = stmt.expression;
			const entity = add(["default"], expression.getText(sf));
			entity.isStable =
				ts.isArrowFunction(expression) || ts.isFunctionExpression(expression);
			entity.isFresh = hasAwait(expression);
			collectRefs(entity.refs, expression);
			mod.exports.set("default", "default");
		} else if (ts.isExportDeclaration(stmt)) {
			if (stmt.isTypeOnly) {
				continue;
			}

			const target = stmt.moduleSpecifier && link(mod, stmt.moduleSpecifier);
			const clause = stmt.exportClause;
			if (clause && ts.isNamedExports(clause)) {
				for (const el of clause.elements) {
					const local = (el.propertyName || el.name).text;
					if (target) {
						mod.reexports.set(el.name.text, {file: target, name: local});
					} else if (!stmt.moduleSpecifier) {
						mod.exports.set(el.name.text, local);
					}
				}
			} else if (target && clause) {
				mod.reexports.set(clause.name.text, {file: target, name: "*"});
			}
		}
	}

	return mod;
}

/**
 * Returns the entity which a name in a module refers to, following imports.
 * An import which cannot be followed to a declaration, such as a namespace
 * or something exported with `export *`, refers to the whole module.
 */
function resolveName(
	mods: Map<string, Module>,
	mod: Module,
	name: string,
	seen: Set<Module>,
): Entity | undefined {
	const entity = mod.names.get(name);
	if (entity) {
		return entity;
	}

	const imported = mod.imports.get(name);
	const target = imported && mods.get(imported.file);
	return target && resolveExport(mods, target, imported!.name, seen);
}

function resolveExport(
	mods: Map<string, Module>,
	mod: Module,
	name: string,
	seen: Set<Module>,
): Entity {
	if (name === "*" || seen.has(mod)) {
		return mod.whole;
	}

	seen.add(mod);
	const local = mod.exports.get(name);
	if (local !== undefined) {
		return resolveName(mods, mod, local, seen) || mod.whole;
	}

	const reexport = mod.reexports.get(name);
	const target = reexport && mods.get(reexport.file);
	return target ? resolveExport(mods, target, reexport!.name, seen) : mod.whole;
}

/**
 * Visits an entity for Tarjan's algorithm, which finds each group of
 * entities which refer to each other after the groups it refers to. A group
 * is hashed together: the source of its members, and the hashes of what
 * they refer to outside it.
 */
function hashEntity(
	entity: Entity,
	stack: Array<Entity>,
	counter: [number],
): void {
	entity.index = entity.low = counter[0]++;
	stack.push(entity);
	entity.onStack = true;
	for (const dep of entity.deps) {
		if (dep.index === -1) {
			hashEntity(dep, stack, counter);
			entity.low = Math.min(entity.low, dep.low);
		} else if (dep.onStack) {
			entity.low = Math.min(entity.low, dep.index);
		}
	}

	if (entity.low !== entity.index) {
		return;
	}

	const members: Array<Entity> = [];
	let member: Entity;
	do {
		member = stack.pop()!;
		member.onStack = false;
		members.push(member);
	} while (member !== entity);

	const parts: Array<string> = [];
	const outside = new Set<string>();
	for (const member of members) {
		parts.push(member.names.join() + "\0" + member.text);
		for (const dep of member.deps) {
			if (!members.includes(dep)) {
				outside.add(dep.hash);
			}
		}
	}

	const result = hash(
		parts.sort().join("\0") + "\0\0" + [...outside].sort().join("\0"),
	);
	for (const member of members) {
		member.hash = result;
	}
}

/**
 * Reads the modules of an app from its entry points, and hashes their
 * top-level bindings.
 *
 * @param build - A number which is different for every bundle.
 */
export function analyze(entryPoints: Array<string>, build: number): Graph {
	const mods = new Map<string, Module>();
	const packages = new Set<string>();
	const queue = [...entryPoints];
	while (queue.length) {
		const file = queue.pop()!;
		if (mods.has(file) || /[\\/]node_modules[\\/]/.test(file)) {
			continue;
		}

		const mod = parse(file);
		mods.set(file, mod);
		queue.push(...mod.links);
		for (const spec of mod.packages) {
			packages.add(spec);
		}
	}

	const entities: Array<Entity> = [];
	for (const mod of mods.values()) {
		entities.push(mod.whole);
		for (const file of mod.links) {
			const target = mods.get(file);
			if (target) {
				mod.whole.deps.add(target.whole);
			}
		}

		for (const entity of mod.entities) {
			entities.push(entity);
			if (entity.isStable) {
				// Whatever a component refers to, it is the same function.
				entity.text = "";
				continue;
			} else if (entity.isFresh) {
				entity.text += "\0" + build;
			}

			for (const name of entity.refs) {
				const dep = resolveName(mods, mod, name, new Set());
				if (dep && dep !== entity) {
					entity.deps.add(dep);
				}
			}
		}
	}

	const stack: Array<Entity> = [];
	const counter: [number] = [0];
	for (const entity of entities) {
		if (entity.index === -1) {
			hashEntity(entity, stack, counter);
		}
	}

	const hashes = new Map<string, Map<string, string>>();
	for (const mod of mods.values()) {
		const names = new Map<string, string>();
		for (const [name, entity] of mod.names) {
			names.set(name, entity.hash);
		}

		hashes.set(mod.file, names);
	}

	return {hashes, packages: [...packages].sort()};
}
