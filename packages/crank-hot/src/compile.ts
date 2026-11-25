import {createHash} from "node:crypto";
import {extname} from "node:path";
import ts from "typescript";
import {applyEdits} from "./edits.ts";
import type {Edit} from "./edits.ts";
import {collapse, createChecker, rewriteLocals} from "./rewrite.ts";

export interface CompileOptions {
	/**
	 * The path of the module, which the keys of its components start with. Its
	 * extension says whether the module has types and JSX.
	 */
	id: string;
	/** The specifier which the module imports the runtime from. */
	runtime?: string;
	/**
	 * The hashes of the top-level names of the module, from analyze(), for a
	 * development server which evaluates every module again with every edit.
	 * A function, class or const whose hash is the same keeps its value.
	 */
	hashes?: Map<string, string>;
}

export interface CompileResult {
	/**
	 * The module, in the language it was written in. The transform only adds
	 * to lines, and to the end of the module, so every line of the source is
	 * on the line it was written on.
	 */
	code: string;
	/**
	 * A source map from the code to the source, as JSON, with a place for
	 * every word of the source.
	 */
	map: string;
}

interface Component {
	name: string;
	// "fn", "gen" or "agen".
	kind: string;
	// The function declaration, or the function which a const is declared with.
	fn: ts.FunctionLikeDeclaration;
	isDeclaration: boolean;
	// Where to wrap a function which is not declared with a name of its own.
	start: number;
	// The statement which the function is in.
	stmt: ts.Node;
}

/** A binding of the module, and how a change to it is noticed. */
interface Binding {
	// "stable": a component, which is the same function through every edit.
	// "text": a function or class, which is the same while its source is.
	// "identity": anything else, which is the same while it is the same value.
	// "fresh": a variable which can be assigned to. Every evaluation of the
	// module has a variable of its own, so it is never the same.
	kind: "stable" | "text" | "identity" | "fresh";
	node?: ts.Node;
}

interface View {
	// The body of the loop, with the statements which leave it rewritten.
	text: string;
	// What was done to the body to make that, as edits to the module.
	edits: Array<Edit>;
	// The vars which are declared in the body of the loop.
	vars: Array<string>;
	// The variables of the component which the body uses.
	locals: Set<string>;
}

const SCRIPT_KINDS: Record<string, ts.ScriptKind> = {
	".ts": ts.ScriptKind.TS,
	".mts": ts.ScriptKind.TS,
	".tsx": ts.ScriptKind.TSX,
	".js": ts.ScriptKind.JS,
	".mjs": ts.ScriptKind.JS,
	".jsx": ts.ScriptKind.JSX,
};

/** The modules which the transform is for, by their paths. */
export const SOURCE = /\.(?:[jt]sx?|m[jt]s)$/;

/** Whether a path is in a package, with the slashes of any system. */
export function isPackage(path: string): boolean {
	return /[\\/]node_modules[\\/]/.test(path);
}

/** The loader which a bundler has for a module, by its path. */
export function getLoader(path: string): string {
	const ext = extname(path).slice(1);
	return ext === "mts" ? "ts" : ext === "mjs" ? "js" : ext;
}

function hash(text: string): string {
	return createHash("sha1").update(text).digest("base64url").slice(0, 12);
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

function getModifier(
	node: ts.Node,
	kind: ts.SyntaxKind,
): ts.Modifier | undefined {
	const modifiers = (node as any).modifiers as
		| ts.NodeArray<ts.Modifier>
		| undefined;
	return modifiers && modifiers.find((m) => m.kind === kind);
}

function getKind(fn: ts.Node): string {
	if (!(fn as any).asteriskToken) {
		return "fn";
	}

	return getModifier(fn, ts.SyntaxKind.AsyncKeyword) ? "agen" : "gen";
}

function isLoop(node: ts.Node): node is ts.IterationStatement {
	return (
		ts.isForOfStatement(node) ||
		ts.isForInStatement(node) ||
		ts.isForStatement(node) ||
		ts.isWhileStatement(node) ||
		ts.isDoStatement(node)
	);
}

function isLexical(list: ts.VariableDeclarationList): boolean {
	return !!(list.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const));
}

/** Whether an identifier is the name of something, and not a use of it. */
function isName(node: ts.Identifier): boolean {
	const parent = node.parent as any;
	return (
		(parent.name === node && !ts.isShorthandPropertyAssignment(parent)) ||
		parent.label === node
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

/**
 * Adds edits which make the return statements of a node keep what they
 * return in a variable, for a finally clause which has been written apart
 * from the statement they are in.
 */
function collectReturns(
	sf: ts.SourceFile,
	node: ts.Node,
	edits: Array<Edit>,
): void {
	if (ts.isFunctionLike(node)) {
		return;
	} else if (ts.isReturnStatement(node)) {
		if (node.expression) {
			const start = node.expression.getStart(sf);
			edits.push([node.getStart(sf), start, "{ __hotValue = ("]);
			edits.push([node.expression.end, node.end, "); return; }"]);
		}

		return;
	}

	ts.forEachChild(node, (child) => collectReturns(sf, child, edits));
}

/**
 * Returns some source without its types, comments and spacing, for telling
 * whether it has changed.
 */
function normalize(text: string, options: CompileOptions): string {
	return ts.transpileModule(text, {
		fileName: options.id,
		compilerOptions: {
			target: ts.ScriptTarget.ESNext,
			module: ts.ModuleKind.ESNext,
			jsx: ts.JsxEmit.Preserve,
			removeComments: true,
		},
	}).outputText;
}

/** Where a declaration starts, after `export` and `default`. */
function getStart(sf: ts.SourceFile, node: ts.Node): number {
	let start = node.getStart(sf);
	for (const kind of [
		ts.SyntaxKind.ExportKeyword,
		ts.SyntaxKind.DefaultKeyword,
	]) {
		const modifier = getModifier(node, kind);
		if (modifier) {
			start = Math.max(start, modifier.end);
		}
	}

	return start;
}

/**
 * Finds the loop which a generator component renders in, which is the loop
 * over its context: `for (props of this)`, or of its second parameter. A
 * loop inside any statement other than a block or the block of a try
 * statement is not looked for.
 */
function findLoop(
	block: ts.Block,
	fn: ts.FunctionLikeDeclaration,
): ts.ForOfStatement | undefined {
	for (let stmt of block.statements) {
		if (ts.isLabeledStatement(stmt)) {
			stmt = stmt.statement;
		}

		if (ts.isForOfStatement(stmt)) {
			const context = fn.parameters[1] && fn.parameters[1].name;
			const of = stmt.expression;
			if (
				of.kind === ts.SyntaxKind.ThisKeyword ||
				(ts.isIdentifier(of) &&
					context &&
					ts.isIdentifier(context) &&
					of.text === context.text)
			) {
				return stmt;
			}
		} else if (ts.isTryStatement(stmt)) {
			const loop = findLoop(stmt.tryBlock, fn);
			if (loop) {
				return loop;
			}
		} else if (ts.isBlock(stmt)) {
			const loop = findLoop(stmt, fn);
			if (loop) {
				return loop;
			}
		}
	}

	return undefined;
}

/**
 * Collects the variables of a function which are in scope at a statement in
 * it, and whether each can be assigned to. This only reads declarations.
 */
function getLocals(
	fn: ts.FunctionLikeDeclaration,
	at: ts.Node,
): Map<string, boolean> {
	const locals = new Map<string, boolean>();
	const names: Array<string> = [];
	for (const param of fn.parameters) {
		getBindingNames(param.name, names);
	}

	// A var belongs to the function, wherever it is declared.
	const collectVars = (node: ts.Node): void => {
		if (ts.isFunctionLike(node)) {
			return;
		} else if (ts.isVariableDeclarationList(node) && !isLexical(node)) {
			for (const decl of node.declarations) {
				getBindingNames(decl.name, names);
			}
		}

		ts.forEachChild(node, collectVars);
	};

	if (fn.body) {
		collectVars(fn.body);
	}

	for (const name of names) {
		// The type of `this` is written as a parameter.
		if (name !== "this") {
			locals.set(name, true);
		}
	}

	// The declarations of each block around the statement.
	for (let node: ts.Node = at; node !== fn; node = node.parent) {
		if (!ts.isBlock(node)) {
			continue;
		}

		for (const stmt of node.statements) {
			if (
				(ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) &&
				stmt.name
			) {
				locals.set(stmt.name.text, true);
			} else if (
				ts.isVariableStatement(stmt) &&
				isLexical(stmt.declarationList)
			) {
				const declared: Array<string> = [];
				for (const decl of stmt.declarationList.declarations) {
					getBindingNames(decl.name, declared);
				}

				for (const name of declared) {
					locals.set(name, !(stmt.declarationList.flags & ts.NodeFlags.Const));
				}
			}
		}
	}

	const init = (at as ts.ForOfStatement).initializer;
	if (init && ts.isVariableDeclarationList(init) && isLexical(init)) {
		const declared: Array<string> = [];
		for (const decl of init.declarations) {
			getBindingNames(decl.name, declared);
		}

		for (const name of declared) {
			locals.set(name, !(init.flags & ts.NodeFlags.Const));
		}
	}

	return locals;
}

/**
 * Returns the body of a loop as the source of the body of a function, or
 * undefined when it cannot be run as one.
 *
 * - Statements which leave the loop become return statements, which the
 *   loop acts on.
 * - A var belongs to the component, so its declaration becomes an
 *   assignment.
 * - The arguments of the component are not those of the function.
 */
function getView(
	sf: ts.SourceFile,
	loop: ts.IterationStatement,
	// What says what a name refers to.
	checker: ts.TypeChecker,
	// The component.
	fn: ts.Node,
): View | undefined {
	const body = loop.statement;
	const label = ts.isLabeledStatement(loop.parent)
		? loop.parent.label.text
		: undefined;
	const edits: Array<Edit> = [];
	const vars: Array<string> = [];
	let ok = true;
	const visit = (
		node: ts.Node,
		inLoop: boolean,
		inSwitch: boolean,
		inArrow: boolean,
		labels: Array<string>,
	): void => {
		if (ts.isTypeNode(node)) {
			return;
		}

		if (ts.isFunctionLike(node)) {
			// An arrow function has the arguments of the component, and nothing
			// in it leaves the loop.
			if (ts.isArrowFunction(node)) {
				ts.forEachChild(node, (child) => visit(child, true, true, true, []));
			}

			return;
		} else if (
			ts.isVariableDeclarationList(node) &&
			!isLexical(node) &&
			!inArrow
		) {
			const start = node.getStart(sf);
			const withInit = node.declarations.filter((d) => d.initializer).length;
			for (const decl of node.declarations) {
				getBindingNames(decl.name, vars);
				// An assignment has no type.
				const typed = decl.type || decl.exclamationToken;
				if (typed && decl.initializer) {
					edits.push([decl.name.end, typed.end, ""]);
				}
			}

			if (
				ts.isForInStatement(node.parent) ||
				ts.isForOfStatement(node.parent)
			) {
				edits.push([start, node.declarations[0].getStart(sf), ""]);
			} else if (withInit === 0 && ts.isVariableStatement(node.parent)) {
				edits.push([start, node.end, ""]);
				return;
			} else if (withInit !== node.declarations.length) {
				ok = false;
			} else if (ts.isVariableStatement(node.parent)) {
				// The parentheses are for a destructuring assignment.
				edits.push([start, node.declarations[0].getStart(sf), "("]);
				edits.push([node.end, node.end, ")"]);
			} else {
				edits.push([start, node.declarations[0].getStart(sf), ""]);
			}
		} else if (ts.isReturnStatement(node) && !inArrow) {
			if (node.expression) {
				const start = node.expression.getStart(sf);
				edits.push([node.getStart(sf), start, "return {value: ("]);
				edits.push([node.expression.end, node.expression.end, ")}"]);
			} else {
				edits.push([node.getStart(sf), node.end, "return {value: undefined};"]);
				return;
			}
		} else if (ts.isBreakStatement(node) || ts.isContinueStatement(node)) {
			const isBreak = ts.isBreakStatement(node);
			const leaves = node.label
				? node.label.text === label
				: !inLoop && !(isBreak && inSwitch);
			if (node.label && !leaves && !labels.includes(node.label.text)) {
				// A label outside the loop.
				ok = false;
			} else if (leaves && inArrow) {
				ok = false;
			} else if (leaves) {
				edits.push([
					node.getStart(sf),
					node.end,
					isBreak ? "return __hot.BREAK;" : "return;",
				]);
			}

			return;
		}

		if (ts.isLabeledStatement(node)) {
			labels = [...labels, node.label.text];
		}

		const loops = inLoop || isLoop(node);
		const switches = inSwitch || ts.isSwitchStatement(node);
		ts.forEachChild(node, (child) =>
			visit(child, loops, switches, inArrow, labels),
		);
	};

	if (ts.isBlock(body)) {
		for (const stmt of body.statements) {
			visit(stmt, false, false, false, []);
		}
	} else {
		visit(body, false, false, false, []);
	}

	if (!ok) {
		return undefined;
	}

	// The uses of the variables of the component go through an object.
	const locals = rewriteLocals(sf, checker, fn, body, "__locals", edits);

	// A body which is one statement is all of the view.
	const start = body.getStart(sf) + (ts.isBlock(body) ? 1 : 0);
	let text = sf.text.slice(start, body.end - (ts.isBlock(body) ? 1 : 0));
	const applied = [...edits].sort((a, b) => b[0] - a[0] || b[1] - a[1]);
	for (const [from, to, replacement] of applied) {
		text = text.slice(0, from - start) + replacement + text.slice(to - start);
	}

	return {text, edits, vars: [...new Set(vars)].sort(), locals};
}

// The names of the global object.
const GLOBAL_OBJECTS = new Set(["globalThis", "window", "self"]);

/**
 * Returns a property access as source which does not throw when part of it
 * is missing, if it is a chain of names from the global object.
 */
function getGlobalChain(
	node: ts.Node,
	declared: Map<string, boolean>,
	bindings: Map<string, Binding>,
): string | undefined {
	if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.name)) {
		const head = getGlobalChain(node.expression, declared, bindings);
		return head && `${head}?.${node.name.text}`;
	} else if (
		ts.isIdentifier(node) &&
		GLOBAL_OBJECTS.has(node.text) &&
		!declared.has(node.text) &&
		!bindings.has(node.text)
	) {
		return node.text;
	}

	return undefined;
}

/**
 * Collects what a node uses which was made outside it: the names of bindings
 * of the module, and, with an equals sign before them, expressions for
 * everything else, to be compared when the module is evaluated again.
 *
 * Only what the function declares for all of itself is taken to be its own.
 * A name which a block or a function inside it declares may be something
 * else outside that block, so it is collected, which can only remount a
 * component which did not need it.
 *
 * - A name which is not declared is a global.
 * - A property of the global object is collected as far as it is written.
 * - Nothing says which module `import()` is for, so the code which calls it
 *   is never the same as it was.
 */
function collectUses(
	node: ts.Node,
	bindings: Map<string, Binding>,
	declared: Map<string, boolean>,
	skip: ts.Node | undefined,
	uses: Set<string>,
): void {
	if (node === skip || ts.isTypeNode(node)) {
		return;
	} else if (
		ts.isCallExpression(node) &&
		node.expression.kind === ts.SyntaxKind.ImportKeyword
	) {
		uses.add("=Symbol()");
	} else if (ts.isPropertyAccessExpression(node)) {
		const chain = getGlobalChain(node, declared, bindings);
		if (chain) {
			uses.add("=" + chain);
			return;
		}
	} else if (ts.isIdentifier(node) && !isName(node)) {
		const parent = node.parent as any;
		const name = node.text;
		if (declared.has(name) || name === "arguments" || name === "undefined") {
			// Its own.
		} else if (bindings.has(name)) {
			uses.add(name);
		} else if (parent.tagName !== node || !/^[a-z]/.test(name)) {
			// The name of an element in JSX is not a variable.
			uses.add(`=typeof ${name} === "undefined" ? undefined : ${name}`);
		}
	}

	ts.forEachChild(node, (child) =>
		collectUses(child, bindings, declared, skip, uses),
	);
}

/**
 * Sorts what a piece of code uses into what is compared as text, which is
 * followed to what it uses in turn, and what is compared as a value when the
 * module is evaluated.
 */
function resolveUses(
	sf: ts.SourceFile,
	options: CompileOptions,
	bindings: Map<string, Binding>,
	uses: Set<string>,
	texts: Map<string, string>,
	identities: Set<string>,
): void {
	for (const name of uses) {
		if (name[0] === "=") {
			identities.add(name.slice(1));
			continue;
		}

		const binding = bindings.get(name)!;
		if (binding.kind === "identity") {
			identities.add(name);
		} else if (binding.kind === "fresh") {
			identities.add("Symbol()");
		} else if (binding.kind === "text" && !texts.has(name)) {
			const node = binding.node!;
			texts.set(
				name,
				normalize(
					ts.isVariableDeclaration(node)
						? `const ${node.getText(sf)}`
						: sf.text.slice(getStart(sf, node), node.end),
					options,
				),
			);
			const inner = new Set<string>();
			const fn = ts.isVariableDeclaration(node) ? node.initializer! : node;
			const body = ts.isFunctionLike(fn)
				? (fn as ts.FunctionLikeDeclaration).body
				: undefined;
			const declared = body
				? getLocals(fn as ts.FunctionLikeDeclaration, body)
				: new Map<string, boolean>();
			collectUses(fn, bindings, declared, undefined, inner);
			resolveUses(sf, options, bindings, inner, texts, identities);
		}
	}
}

/**
 * Returns what to add to a signature for the functions of the module which
 * some code uses, and the source of a function which returns the values it
 * uses, or "null" when there are none.
 */
function getInputs(
	sf: ts.SourceFile,
	options: CompileOptions,
	bindings: Map<string, Binding>,
	uses: Set<string>,
): [string, string] {
	const texts = new Map<string, string>();
	const identities = new Set<string>();
	resolveUses(sf, options, bindings, uses, texts, identities);
	const text = [...texts.keys()]
		.sort()
		.map((name) => texts.get(name))
		.join("\0");
	const names = [...identities].sort();
	return [text, names.length ? `() => [${names.join(", ")}]` : "null"];
}

/**
 * Returns a source map which says where every word of a module was in its
 * source, as JSON.
 */
function createMap(
	source: string,
	options: CompileOptions,
	edits: Array<Edit>,
): string {
	return JSON.stringify({
		version: 3,
		file: options.id,
		sources: [options.id],
		sourcesContent: [source],
		names: [],
		mappings: applyEdits(source, edits).mappings,
	});
}

/**
 * Transforms a module so that its components can be hot reloaded: a component
 * keeps its state when only what it renders is edited, and is remounted when
 * anything else in it is.
 *
 * The transform reads declarations and copies text. It never works out what
 * a name in the body of a loop refers to.
 */
export function compile(
	source: string,
	options: CompileOptions,
): CompileResult {
	const sf = ts.createSourceFile(
		options.id,
		source,
		ts.ScriptTarget.Latest,
		true,
		SCRIPT_KINDS[extname(options.id)] || ts.ScriptKind.TSX,
	);

	// The bindings of the module, and what it exports.
	const bindings = new Map<string, Binding>();
	const exported = new Set<string>();
	const components: Array<Component> = [];
	// Consts which are declared with the result of a call, and are named like
	// components.
	// The other functions, classes and consts, which keep their values
	// between bundles when there are hashes for them.
	const kept: Array<ts.Node> = [];
	const hashes = options.hashes;
	let isBoundary = true;
	let lastImportEnd = 0;
	for (const stmt of sf.statements) {
		const isExport = !!getModifier(stmt, ts.SyntaxKind.ExportKeyword);
		if (getModifier(stmt, ts.SyntaxKind.DeclareKeyword)) {
			continue;
		} else if (ts.isImportDeclaration(stmt)) {
			lastImportEnd = stmt.end;
			const clause = stmt.importClause;
			if (!clause || clause.isTypeOnly) {
				continue;
			}

			if (clause.name) {
				bindings.set(clause.name.text, {kind: "identity"});
			}

			const named = clause.namedBindings;
			if (named && ts.isNamespaceImport(named)) {
				bindings.set(named.name.text, {kind: "identity"});
			} else if (named) {
				for (const el of named.elements) {
					if (!el.isTypeOnly) {
						bindings.set(el.name.text, {kind: "identity"});
					}
				}
			}
		} else if (ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) {
			if (ts.isFunctionDeclaration(stmt) && !stmt.body) {
				// An overload.
				continue;
			} else if (!stmt.name) {
				const keyword = getModifier(stmt, ts.SyntaxKind.DefaultKeyword);
				if (keyword && ts.isFunctionDeclaration(stmt)) {
					// The declaration becomes an expression.
					exported.add("default");
					components.push({
						name: "default",
						kind: getKind(stmt),
						fn: stmt,
						isDeclaration: false,
						start: keyword.end,
						stmt,
					});
				} else {
					isBoundary = false;
				}

				continue;
			}

			const name = stmt.name.text;
			if (isExport) {
				exported.add(name);
			}

			if (ts.isFunctionDeclaration(stmt) && /^[A-Z]/.test(name)) {
				bindings.set(name, {kind: "stable"});
				components.push({
					name,
					kind: getKind(stmt),
					fn: stmt,
					isDeclaration: true,
					start: stmt.getStart(sf),
					stmt,
				});
			} else {
				bindings.set(name, {kind: "text", node: stmt});
				kept.push(stmt);
			}
		} else if (ts.isVariableStatement(stmt)) {
			const isConst = !!(stmt.declarationList.flags & ts.NodeFlags.Const);
			for (const decl of stmt.declarationList.declarations) {
				const names: Array<string> = [];
				getBindingNames(decl.name, names);
				for (const name of names) {
					bindings.set(name, {kind: isConst ? "identity" : "fresh"});
					if (isExport) {
						exported.add(name);
					}
				}

				const init = decl.initializer;
				if (isConst && init && !ts.isIdentifier(decl.name) && !hasAwait(init)) {
					kept.push(decl);
				}

				if (!isConst || !init || !ts.isIdentifier(decl.name)) {
					continue;
				}

				const name = decl.name.text;
				const isFunction =
					ts.isArrowFunction(init) || ts.isFunctionExpression(init);
				if (isFunction && /^[A-Z]/.test(name)) {
					bindings.set(name, {kind: "stable"});
					components.push({
						name,
						kind: getKind(init),
						fn: init,
						isDeclaration: false,
						start: init.getStart(sf),
						stmt,
					});
				} else if (isFunction) {
					bindings.set(name, {kind: "text", node: decl});
					kept.push(decl);
				} else if (!hasAwait(init)) {
					kept.push(decl);
				}
			}
		} else if (ts.isEnumDeclaration(stmt) || ts.isModuleDeclaration(stmt)) {
			if (ts.isIdentifier(stmt.name)) {
				bindings.set(stmt.name.text, {kind: "identity"});
				if (isExport) {
					exported.add(stmt.name.text);
				}
			}
		} else if (ts.isExportDeclaration(stmt)) {
			const clause = stmt.exportClause;
			if (stmt.isTypeOnly) {
				continue;
			} else if (
				stmt.moduleSpecifier ||
				!clause ||
				!ts.isNamedExports(clause)
			) {
				isBoundary = false;
			} else {
				for (const el of clause.elements) {
					if (!el.isTypeOnly) {
						exported.add((el.propertyName || el.name).text);
					}
				}
			}
		} else if (ts.isExportAssignment(stmt)) {
			const expression = stmt.expression;
			if (ts.isIdentifier(expression)) {
				exported.add(expression.text);
			} else if (
				!stmt.isExportEquals &&
				(ts.isArrowFunction(expression) || ts.isFunctionExpression(expression))
			) {
				exported.add("default");
				components.push({
					name: "default",
					kind: getKind(expression),
					fn: expression,
					isDeclaration: false,
					start: expression.getStart(sf),
					stmt,
				});
			} else {
				isBoundary = false;
			}
		}
	}

	if (!components.length && !(hashes && kept.length)) {
		return {code: source, map: createMap(source, options, [])};
	}

	const edits: Array<Edit> = [];
	// Made when the first view needs it.
	let checker: ts.TypeChecker | undefined;
	// Nothing is put on a line of its own.
	let header = `;import * as __hot from ${JSON.stringify(
		options.runtime || "@b9g/crank-hot/runtime",
	)};`;
	for (const component of components) {
		const {fn, name} = component;
		const key = JSON.stringify(`${options.id}#${name}`);
		let signature = "";
		let viewArg = "null";
		let inputs = "null";
		// Whether what closes the call to register() has been written.
		let isClosed = false;
		if (component.kind !== "fn") {
			// A function component has nothing which outlives a render, so every
			// version of one is the same component.
			const loop = findLoop(fn.body as ts.Block, fn);
			// The body of the loop becomes a function. When
			// the loop is a statement of the component itself, the function is
			// declared after the loop, inside the component, and the runtime
			// calls the component to get it. Otherwise the function goes after
			// the component, so what comes after the loop is moved to before
			// it, and has to fit on a line.
			const holder =
				loop && ts.isLabeledStatement(loop.parent) ? loop.parent : loop;
			let isNested = !!holder && holder.parent === fn.body;
			// A loop which is the last statement of a try statement of the
			// component. The try statement is ended after the loop, with a
			// catch clause which keeps what was thrown, and started again
			// after the view, where what was thrown is thrown again. So the
			// view is declared in the component itself, and the catch and
			// finally clauses stay where they were written.
			let split: ts.TryStatement | undefined;
			if (holder && !isNested) {
				const block = holder.parent;
				const statement = block.parent;
				if (
					ts.isBlock(block) &&
					ts.isTryStatement(statement) &&
					statement.tryBlock === block &&
					statement.parent === fn.body &&
					// What comes after the loop is in the second part, where
					// what the first part declares for the block is not.
					(block.statements[block.statements.length - 1] === holder ||
						!block.statements.some(
							(s) =>
								s.end <= holder.pos &&
								(ts.isFunctionDeclaration(s) ||
									ts.isClassDeclaration(s) ||
									(ts.isVariableStatement(s) && isLexical(s.declarationList))),
						))
				) {
					split = statement;
					isNested = true;
				}
			}

			let tail: string | undefined;
			if (loop && isNested) {
				tail = "";
			} else if (loop) {
				const after = source.slice(fn.end, component.stmt.end).trim();
				if (after === "" || after === ";") {
					tail = collapse(
						sf,
						fn,
						loop.statement.end,
						fn.end,
						new Map(component.isDeclaration ? [] : [[fn.end, ")"]]),
					);
				}
			}

			let view =
				loop && tail !== undefined
					? getView(sf, loop, (checker ||= createChecker(sf)), fn)
					: undefined;
			if (view) {
				// Every variable which the view uses has to be one which the
				// component hands over. If one is not, the component is left
				// whole, which is safe, where a missing one would be undefined.
				const handed = getLocals(fn, loop!);
				for (const name of view.locals) {
					if (name !== "arguments" && !handed.has(name)) {
						view = undefined;
						break;
					}
				}
			}

			const body = view && loop!.statement;
			const uses = new Set<string>();
			collectUses(fn, bindings, getLocals(fn, fn.body!), body, uses);
			const [texts, values] = getInputs(sf, options, bindings, uses);
			inputs = values;
			const start = getStart(sf, fn);
			if (view && body) {
				// The signature is the component without the body of its loop,
				// and without its types, comments and spacing.
				signature = hash(
					component.kind +
						normalize(
							`(${source.slice(start, body.getStart(sf))}{}${source.slice(
								body.end,
								fn.end,
							)})`,
							options,
						) +
						"\0" +
						view.vars.join() +
						"\0" +
						texts,
				);

				let accessors = "";
				for (const [local, isWritable] of getLocals(fn, loop!)) {
					accessors += ` get ${local}() { return ${local}; },`;
					if (isWritable) {
						accessors += ` set ${local}(__value) { ${local} = __value; },`;
					}
				}

				// The arguments of the component, for a view which uses them. A
				// getter would have arguments of its own.
				accessors += " __arguments: arguments,";

				const top = fn.body!.getStart(sf) + 1;
				edits.push([
					top,
					top,
					// A var of the body is declared where the body was.
					// The runtime calls the component for its view. This is the
					// first statement, so nothing else of the component runs.
					(isNested
						? " if (__hot.isExtracting()) return __hot.extract(__hotView);"
						: "") +
						` __hot.mount(${key}, this);` +
						(view.vars.length ? ` var ${view.vars.join(", ")};` : ""),
				]);
				const seam =
					`{ const __result = yield* __hot.view(${key}).call(this, {__proto__: null,${accessors} });` +
					` if (__result === __hot.BREAK) break;` +
					` if (__result) return __result.value; }`;
				const isTyped = /\.tsx?$/.test(options.id);
				const parameters = isTyped ? "this: any, __locals: any" : "__locals";
				const generator =
					component.kind === "agen" ? "async function*" : "function*";
				if (isNested) {
					// The loop asks for the newest view on every pass. The view
					// is declared after it, starting where the body of the loop
					// did, so every line of the component stays where it was. A
					// function declaration is there from the start of the
					// component, which is how the first statement can return it.
					// The body stays where it is, with its own edits, so that the
					// source map can say where each word of it was.
					const isBlock = ts.isBlock(body);
					const open: [number, number] = [
						body.getStart(sf),
						body.getStart(sf) + (isBlock ? 1 : 0),
					];
					const declaration = `${generator} __hotView(${parameters}) {`;
					const close = isBlock ? "" : "}";
					edits.push(...view.edits);
					if (!split) {
						edits.push([...open, `${seam} ${declaration}`]);
						if (close) {
							edits.push([body.end, body.end, close]);
						}
					} else if (split.finallyBlock) {
						// A return in the first part would not run the finally
						// clause, so the first part has one of its own, which
						// leaves the statement instead, and the second part
						// returns.
						const at = split.getStart(sf);
						edits.push([at, at, "__hotTry: "]);
						// A return before the loop keeps its value the same way.
						for (const statement of split.tryBlock.statements) {
							if (statement.end <= holder!.pos) {
								collectReturns(sf, statement, edits);
							}
						}

						edits.push([
							top,
							top,
							" var __hotThrew, __hotError, __hotDone, __hotReturned, __hotValue;",
						]);
						edits.push([
							...open,
							`{ const __result = yield* __hot.view(${key}).call(this, {__proto__: null,${accessors} });` +
								` if (__result === __hot.BREAK) break;` +
								` if (__result) { __hotValue = __result.value; return; } }` +
								` __hotDone = true; } catch (__hotCaught) { __hotThrew = true; __hotError = __hotCaught; }` +
								` finally { if (!__hotDone && !__hotThrew) { __hotReturned = true; break __hotTry; } }` +
								` ${declaration}`,
						]);
						edits.push([
							body.end,
							body.end,
							`${close} try { if (__hotThrew) throw __hotError; if (__hotReturned) return __hotValue;`,
						]);
					} else {
						edits.push([top, top, " var __hotThrew, __hotError;"]);
						edits.push([
							...open,
							`${seam} } catch (__hotCaught) { __hotThrew = true; __hotError = __hotCaught; }` +
								` ${declaration}`,
						]);
						edits.push([
							body.end,
							body.end,
							`${close} try { if (__hotThrew) throw __hotError;`,
						]);
					}

					viewArg = '"extract"';
				} else {
					// The view goes after the component. What came after the
					// loop comes first, on the same line, and the lines which it
					// was on are left empty.
					const end = component.stmt.end;
					edits.push([
						body.getStart(sf),
						end,
						`${seam}${tail}; __hot.setView(${key}, ${generator} (${parameters}) {` +
							view.text +
							"});" +
							"\n".repeat(source.slice(body.end, end).split("\n").length - 1),
					]);
					viewArg = "true";
					isClosed = true;
				}
			} else {
				signature = hash(
					component.kind +
						normalize(`(${source.slice(start, fn.end)})`, options) +
						"\0" +
						texts,
				);
			}
		}

		const args = `${key}, ${JSON.stringify(component.kind)}, ${JSON.stringify(
			signature,
		)}, ${viewArg}, ${inputs}, `;
		if (component.isDeclaration) {
			// Function declarations are hoisted, so the binding holds what the
			// runtime returns before anything in the module runs.
			header += `${name} = __hot.register(${args}${name});`;
		} else {
			edits.push([component.start, component.start, ` __hot.register(${args}`]);
			if (!isClosed) {
				edits.push([fn.end, fn.end, ")"]);
			}
		}
	}

	for (const node of hashes ? kept : []) {
		const names: Array<string> = [];
		if (ts.isVariableDeclaration(node)) {
			getBindingNames(node.name, names);
		} else {
			names.push((node as ts.FunctionDeclaration).name!.text);
		}

		const signature = hashes!.get(names[0]);
		if (signature === undefined) {
			continue;
		}

		const open = `__hot.reuse(${JSON.stringify(
			`${options.id}#${names.join()}`,
		)}, ${JSON.stringify(signature)}, () => (`;
		if (ts.isVariableDeclaration(node)) {
			const init = node.initializer!;
			edits.push([init.getStart(sf), init.getStart(sf), open]);
			edits.push([init.end, init.end, "))"]);
		} else if (ts.isFunctionDeclaration(node)) {
			header += `${names[0]} = ${open}${names[0]}));`;
		} else {
			// A class declaration is not hoisted.
			edits.push([node.end, node.end, `;${names[0]} = ${open}${names[0]}));`]);
		}
	}

	let footer = "\n";
	// A module which exports anything other than components cannot be
	// replaced on its own, because what imports it would keep the old exports.
	const names = new Set(components.map((c) => c.name));
	if (
		components.length &&
		isBoundary &&
		[...exported].every((e) => names.has(e))
	) {
		footer += "if (import.meta.hot) { import.meta.hot.accept(); }\n";
	}

	edits.push([lastImportEnd, lastImportEnd, header]);
	return {
		code: applyEdits(source, edits).code + footer,
		map: createMap(source, options, edits),
	};
}
