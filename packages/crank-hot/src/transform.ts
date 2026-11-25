import {createHash} from "node:crypto";
import {extname} from "node:path";
import ts from "typescript";
import {collapse, rewriteLocals} from "./rewrite.ts";

export interface HotOptions {
	/**
	 * The path of the module, which the keys of its components start with. Its
	 * extension says whether the module has types and JSX.
	 */
	id: string;
	/** The specifier which the module imports the runtime from. */
	runtime: string;
	/**
	 * Whether a module which only exports components accepts its own
	 * replacement with `import.meta.hot.accept()`.
	 */
	accept?: boolean;
	/**
	 * The hashes of the top-level names of the module, from analyze(), for a
	 * development server which evaluates every module again with every edit.
	 * A function, class or const whose hash is the same keeps its value.
	 */
	hashes?: Map<string, string>;
	/**
	 * Whether the body of a loop is a function of the module, and not text
	 * which the runtime evaluates. The uses of the variables of the component
	 * in it are rewritten, and nothing needs `unsafe-eval`.
	 */
	rewrite?: boolean;
	/** Whether transform() ends the module with its source map. */
	sourceMap?: boolean;
	/** Options for compiling the body of a loop, such as the target. */
	compilerOptions?: ts.CompilerOptions;
}

export interface HotResult {
	/**
	 * The module, in the language it was written in. The transform only adds
	 * to lines, and to the end of the module, so every line of the source is
	 * on the line it was written on.
	 */
	code: string;
	/** A source map which says so, as JSON. */
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
	isImport?: boolean;
}

interface View {
	// The body of the loop, with the statements which leave it rewritten.
	text: string;
	// Where the body starts in the module.
	line: number;
	column: number;
	// The vars which are declared in the body of the loop.
	vars: Array<string>;
	usesArguments: boolean;
	// The specifiers which the body imports when it runs.
	imports: Array<string>;
}

type Edit = [number, number, string];

const SCRIPT_KINDS: Record<string, ts.ScriptKind> = {
	".ts": ts.ScriptKind.TS,
	".tsx": ts.ScriptKind.TSX,
	".js": ts.ScriptKind.JS,
	".jsx": ts.ScriptKind.JSX,
};

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

function hasYield(node: ts.Node): boolean {
	if (ts.isYieldExpression(node)) {
		return true;
	} else if (ts.isFunctionLike(node)) {
		return false;
	}

	return !!ts.forEachChild(node, hasYield);
}

/**
 * Compiles a piece of a module to JavaScript. JSX becomes calls to names
 * which the runtime provides, so that the body of a loop does not need what
 * the module compiles its JSX to.
 */
function compileText(
	text: string,
	options: HotOptions,
	sourceMap: boolean,
): ts.TranspileOutput {
	return ts.transpileModule(text, {
		fileName: options.id,
		compilerOptions: {
			target: ts.ScriptTarget.ESNext,
			...options.compilerOptions,
			module: ts.ModuleKind.ESNext,
			jsx: ts.JsxEmit.React,
			jsxFactory: "__hotCreateElement",
			jsxFragmentFactory: "__hotFragment",
			// Comments are not part of what a component is.
			removeComments: true,
			sourceMap,
			inlineSourceMap: false,
		},
	});
}

/**
 * Returns some source without its types, comments and spacing, for telling
 * whether it has changed.
 */
function normalize(text: string, options: HotOptions): string {
	return compileText(text, options, false).outputText;
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
 * Finds the loop which a generator component renders in: the first loop with
 * a yield in it, not counting loops inside other statements than blocks and
 * the blocks of try statements.
 */
function findLoop(block: ts.Block): ts.IterationStatement | undefined {
	for (let stmt of block.statements) {
		if (ts.isLabeledStatement(stmt)) {
			stmt = stmt.statement;
		}

		if (isLoop(stmt)) {
			if (hasYield(stmt.statement)) {
				return stmt;
			}
		} else if (ts.isTryStatement(stmt)) {
			const loop = findLoop(stmt.tryBlock);
			if (loop) {
				return loop;
			}
		} else if (ts.isBlock(stmt)) {
			const loop = findLoop(stmt);
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
 * A function which is found through `with` is called with the object it was
 * found on as its `this`. Every call of a name is written so that the name
 * is read first, which calls it with nothing.
 */
function wrapCallees(
	sf: ts.SourceFile,
	node: ts.Node,
	edits: Array<Edit>,
): void {
	if (ts.isTypeNode(node)) {
		return;
	}

	const callee = ts.isCallExpression(node)
		? node.expression
		: ts.isTaggedTemplateExpression(node)
			? node.tag
			: undefined;
	// A call of eval by its name is a different kind of call.
	if (callee && ts.isIdentifier(callee) && callee.text !== "eval") {
		edits.push([callee.getStart(sf), callee.getStart(sf), "(0, "]);
		edits.push([callee.end, callee.end, ")"]);
	}

	ts.forEachChild(node, (child) => wrapCallees(sf, child, edits));
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
	// The variables in scope at the loop, when their uses are rewritten.
	rewrite?: Map<string, boolean>,
): View | undefined {
	const body = loop.statement;
	const label = ts.isLabeledStatement(loop.parent)
		? loop.parent.label.text
		: undefined;
	const edits: Array<Edit> = [];
	const vars: Array<string> = [];
	const imports: Array<string> = [];
	let usesArguments = false;
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
		} else if (
			ts.isIdentifier(node) &&
			node.text === "arguments" &&
			!isName(node)
		) {
			usesArguments = true;
			if (!rewrite) {
				edits.push([node.getStart(sf), node.end, "__arguments"]);
			}

			return;
		} else if (
			ts.isCallExpression(node) &&
			node.expression.kind === ts.SyntaxKind.ImportKeyword
		) {
			// What a view imports is found from its module, which is not where
			// the view is evaluated.
			const specifier = node.arguments[0];
			if (specifier && ts.isStringLiteralLike(specifier)) {
				imports.push(specifier.text);
			}

			if (!rewrite) {
				edits.push([
					node.expression.getStart(sf),
					node.expression.end,
					"__import",
				]);
			}
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
					isBreak
						? rewrite
							? "return __hot.BREAK;"
							: "return __BREAK;"
						: "return;",
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

	if (rewrite) {
		rewriteLocals(sf, body, rewrite, "__locals", edits);
	} else {
		wrapCallees(sf, body, edits);
	}

	// A body which is one statement is all of the view.
	const start = body.getStart(sf) + (ts.isBlock(body) ? 1 : 0);
	let text = sf.text.slice(start, body.end - (ts.isBlock(body) ? 1 : 0));
	edits.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
	for (const [from, to, replacement] of edits) {
		text = text.slice(0, from - start) + replacement + text.slice(to - start);
	}

	const {line, character} = sf.getLineAndCharacterOfPosition(start);
	return {
		text,
		line,
		column: character,
		vars: [...new Set(vars)].sort(),
		usesArguments,
		imports,
	};
}

/**
 * Compiles a view to a generator function, with a source map from it to the
 * module. Returns the source of an array for the runtime: the function as
 * JavaScript, and the mappings and names of its map.
 *
 * The body is put where it is in the module, after a first line for the
 * function, so that the map which the compiler writes is to the lines and
 * columns of the module.
 */
function compileView(view: View, kind: string, options: HotOptions): string {
	const output = compileText(
		`(${kind === "agen" ? "async " : ""}function* () { "use strict";` +
			"\n".repeat(view.line) +
			" ".repeat(view.line ? view.column : 0) +
			view.text +
			"\n})",
		options,
		true,
	);
	const js = output.outputText
		.replace(/\n\/\/# sourceMappingURL=.*\s*$/, "")
		.trim()
		.replace(/;$/, "");
	const map = JSON.parse(output.sourceMapText!);
	return `[${JSON.stringify(js)}, ${JSON.stringify(map.mappings)}, ${JSON.stringify(
		map.names || [],
	)}]`;
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
	options: HotOptions,
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
	options: HotOptions,
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
 * Collects the names which are used as values somewhere in a module. An
 * import which is only used as a type is not there when the module runs.
 */
function collectValues(node: ts.Node, values: Set<string>): void {
	if (ts.isTypeNode(node) || ts.isImportDeclaration(node)) {
		return;
	} else if (ts.isIdentifier(node) && !isName(node)) {
		values.add(node.text);
	}

	ts.forEachChild(node, (child) => collectValues(child, values));
}

/**
 * Transforms a module so that its components can be hot reloaded: a component
 * keeps its state when only what it renders is edited, and is remounted when
 * anything else in it is.
 *
 * The transform reads declarations and copies text. It never works out what
 * a name in the body of a loop refers to.
 */
export function compile(source: string, options: HotOptions): HotResult {
	const sf = ts.createSourceFile(
		options.id,
		source,
		ts.ScriptTarget.Latest,
		true,
		SCRIPT_KINDS[extname(options.id)] || ts.ScriptKind.TSX,
	);

	// Every line of the module is on the line it was written on.
	const map = JSON.stringify({
		version: 3,
		file: options.id,
		sources: [options.id],
		sourcesContent: [source],
		names: [],
		mappings: "AAAA" + ";AACA".repeat(source.split("\n").length - 1),
	});

	// The bindings of the module, and what it exports.
	const bindings = new Map<string, Binding>();
	const exported = new Set<string>();
	const components: Array<Component> = [];
	// Consts which are declared with the result of a call, and are named like
	// components.
	const calls: Array<ts.VariableDeclaration> = [];
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
				bindings.set(clause.name.text, {kind: "identity", isImport: true});
			}

			const named = clause.namedBindings;
			if (named && ts.isNamespaceImport(named)) {
				bindings.set(named.name.text, {kind: "identity", isImport: true});
			} else if (named) {
				for (const el of named.elements) {
					if (!el.isTypeOnly) {
						bindings.set(el.name.text, {kind: "identity", isImport: true});
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
				} else if (ts.isCallExpression(init) && /^[A-Z]/.test(name)) {
					calls.push(decl);
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

	if (!components.length && !calls.length && !(hashes && kept.length)) {
		return {code: source, map};
	}

	const edits: Array<Edit> = [];
	// The specifiers which views import when they run.
	const viewImports = new Set<string>();
	// Nothing is put on a line of its own.
	let header = `;import * as __hot from ${JSON.stringify(options.runtime)};`;
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
			const loop = findLoop(fn.body as ts.Block);
			// Without evaluating text, the body of the loop is a function after
			// the component, so what comes after the loop is moved to before
			// it, and has to fit on a line.
			let tail: string | undefined;
			if (loop && options.rewrite) {
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

			const view =
				loop && (!options.rewrite || tail !== undefined)
					? getView(sf, loop, options.rewrite ? getLocals(fn, loop) : undefined)
					: undefined;
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
					` __hot.mount(${key}, this);` +
						(options.rewrite && view.vars.length
							? ` var ${view.vars.join(", ")};`
							: ""),
				]);
				if (options.rewrite) {
					// The loop asks for the newest view on every pass. What came
					// after the loop comes next, on the same line, and then the
					// view, which starts where the body of the loop did. The
					// lines which the rest was on are left empty.
					const end = component.stmt.end;
					const isTyped = /\.tsx?$/.test(options.id);
					edits.push([
						body.getStart(sf),
						end,
						`{ const __result = yield* __hot.view(${key}).call(this, {__proto__: null,${accessors} });` +
							` if (__result === __hot.BREAK) break;` +
							` if (__result) return __result.value; }` +
							`${tail}; __hot.setView(${key}, ${
								component.kind === "agen" ? "async " : ""
							}function* (${
								isTyped ? "this: any, __locals: any" : "__locals"
							}) {` +
							view.text +
							"});" +
							"\n".repeat(source.slice(body.end, end).split("\n").length - 1),
					]);
					viewArg = "true";
					isClosed = true;
				} else {
					const isBlock = ts.isBlock(body);
					const at = body.getStart(sf) + (isBlock ? 1 : 0);
					edits.push([
						at,
						at,
						// The body is put in a block of its own, so that what it
						// declares is not what the getters and setters see.
						`${isBlock ? "" : "{"} { const __view = __hot.view(${key}, () => ({__proto__: null,${accessors} }));` +
							` if (__view) { const __result = yield* __view.call(this);` +
							` if (__result === __hot.BREAK) break;` +
							` if (__result) return __result.value; continue; } } {`,
					]);
					edits.push([
						body.end - (isBlock ? 1 : 0),
						body.end - (isBlock ? 1 : 0),
						" }",
					]);
					if (!isBlock) {
						edits.push([body.end, body.end, " }"]);
					}

					for (const specifier of view.imports) {
						viewImports.add(specifier);
					}

					viewArg = compileView(view, component.kind, options);
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
		)}, ${viewArg}, __hotScope, ${inputs}, `;
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

	for (const decl of calls) {
		// The result of a call is kept while the call and what it uses are the
		// same, so that a component which a function makes is not a new
		// component every time the module is evaluated.
		const init = decl.initializer!;
		const name = (decl.name as ts.Identifier).text;
		const uses = new Set<string>();
		collectUses(init, bindings, new Map(), undefined, uses);
		let [texts, values] = getInputs(sf, options, bindings, uses);
		let signature = hash(
			normalize(`(${init.getText(sf)})`, options) + "\0" + texts,
		);
		if (hashes && hashes.has(name)) {
			// The hash already covers what the call uses.
			signature = hashes.get(name)!;
			values = "null";
		}

		edits.push([
			init.getStart(sf),
			init.getStart(sf),
			`__hot.value(${JSON.stringify(`${options.id}#${name}`)}, ${JSON.stringify(
				signature,
			)}, ${values}, () => (`,
		]);
		edits.push([init.end, init.end, "))"]);
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

	// What a view can reach of the module. An import which is only used as a
	// type is not there when the module runs.
	const values = new Set<string>();
	collectValues(sf, values);
	let footer = "\nfunction __hotScope() { return {__proto__: null,";
	for (const [name, binding] of bindings) {
		if (!binding.isImport || values.has(name)) {
			footer += ` get ${name}() { return ${name}; },`;
		}
	}

	// The imports are written out, so that whatever bundles the module can
	// see them.
	footer += " __import(__specifier) { switch (__specifier) {";
	for (const specifier of viewImports) {
		const literal = JSON.stringify(specifier);
		footer += ` case ${literal}: return import(${literal});`;
	}

	footer += " default: return import(__specifier); } },";
	footer += ` }; }\n__hotScope.id = ${JSON.stringify(
		options.id,
	)};\n__hotScope.source = ${JSON.stringify(source)};\n`;
	// A module which exports anything other than components cannot be
	// replaced on its own, because what imports it would keep the old exports.
	const names = new Set(components.map((c) => c.name));
	if (
		options.accept &&
		components.length &&
		isBoundary &&
		[...exported].every((e) => names.has(e))
	) {
		footer += "if (import.meta.hot) { import.meta.hot.accept(); }\n";
	}

	edits.push([lastImportEnd, lastImportEnd, header]);
	edits.sort((a, b) => b[0] - a[0]);
	let code = source;
	for (const [start, end, text] of edits) {
		code = code.slice(0, start) + text + code.slice(end);
	}

	return {code: code + footer, map};
}

/**
 * The same as compile(), returning the code alone.
 */
export function transform(source: string, options: HotOptions): string {
	const {code, map} = compile(source, options);
	if (!options.sourceMap) {
		return code;
	}

	return (
		code +
		"//# sourceMappingURL=data:application/json;base64," +
		Buffer.from(map).toString("base64") +
		"\n"
	);
}
