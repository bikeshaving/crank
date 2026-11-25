import {createHash} from "node:crypto";
import ts from "typescript";

export interface HotOptions {
	/** What the keys of the components of the module start with. */
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
	/** Whether transform() ends the module with its source map. */
	sourceMap?: boolean;
	/** Options for compiling TypeScript and JSX, which happens first. */
	compilerOptions?: ts.CompilerOptions;
}

export interface HotResult {
	code: string;
	/**
	 * A source map from the code to the source, as JSON. The transform only
	 * adds to the ends of lines, so the lines of the map are exact and the
	 * columns of a line which was added to are not.
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
	text: string;
	// The vars which are declared in the body of the loop.
	vars: Array<string>;
	usesArguments: boolean;
}

type Edit = [number, number, string];

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

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
	const modifiers = (node as any).modifiers as
		| ts.NodeArray<ts.Modifier>
		| undefined;
	return !!modifiers && modifiers.some((m) => m.kind === kind);
}

function getKind(fn: ts.Node): string {
	if (!(fn as any).asteriskToken) {
		return "fn";
	}

	return hasModifier(fn, ts.SyntaxKind.AsyncKeyword) ? "agen" : "gen";
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
		locals.set(name, true);
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
): View | undefined {
	const body = loop.statement;
	const label = ts.isLabeledStatement(loop.parent)
		? loop.parent.label.text
		: undefined;
	const edits: Array<Edit> = [];
	const vars: Array<string> = [];
	let usesArguments = false;
	let ok = true;
	const visit = (
		node: ts.Node,
		inLoop: boolean,
		inSwitch: boolean,
		inArrow: boolean,
		labels: Array<string>,
	): void => {
		if (ts.isIdentifier(node) && node.text === "arguments" && !isName(node)) {
			usesArguments = true;
			edits.push([node.getStart(sf), node.end, "__arguments"]);
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
					isBreak ? "return __BREAK;" : "return;",
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

	// A body which is one statement is all of the view.
	const start = body.getStart(sf) + (ts.isBlock(body) ? 1 : 0);
	let text = sf.text.slice(start, body.end - (ts.isBlock(body) ? 1 : 0));
	edits.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
	for (const [from, to, replacement] of edits) {
		text = text.slice(0, from - start) + replacement + text.slice(to - start);
	}

	return {text, vars: [...new Set(vars)].sort(), usesArguments};
}

/**
 * Collects the bindings of the module which a node uses. A name which the
 * function around it declares is not one, wherever in the function it is
 * used, which can only miss a use when a function has a variable with the
 * name of a binding of the module in one block and uses the binding in
 * another.
 */
function collectUses(
	node: ts.Node,
	bindings: Map<string, Binding>,
	declared: Map<string, boolean>,
	skip: ts.Node | undefined,
	uses: Set<string>,
): void {
	if (node === skip) {
		return;
	} else if (
		ts.isIdentifier(node) &&
		!isName(node) &&
		bindings.has(node.text) &&
		!declared.has(node.text)
	) {
		uses.add(node.text);
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
	bindings: Map<string, Binding>,
	uses: Set<string>,
	texts: Map<string, string>,
	identities: Set<string>,
): void {
	for (const name of uses) {
		const binding = bindings.get(name)!;
		if (binding.kind === "identity") {
			identities.add(name);
		} else if (binding.kind === "fresh") {
			identities.add("Symbol()");
		} else if (binding.kind === "text" && !texts.has(name)) {
			const node = binding.node!;
			texts.set(name, node.getText(sf));
			const inner = new Set<string>();
			const fn = ts.isVariableDeclaration(node) ? node.initializer! : node;
			const body = ts.isFunctionLike(fn)
				? (fn as ts.FunctionLikeDeclaration).body
				: undefined;
			const declared = body
				? getLocals(fn as ts.FunctionLikeDeclaration, body)
				: new Map<string, boolean>();
			collectUses(fn, bindings, declared, undefined, inner);
			resolveUses(sf, bindings, inner, texts, identities);
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
	bindings: Map<string, Binding>,
	uses: Set<string>,
): [string, string] {
	const texts = new Map<string, string>();
	const identities = new Set<string>();
	resolveUses(sf, bindings, uses, texts, identities);
	const text = [...texts.keys()]
		.sort()
		.map((name) => texts.get(name))
		.join("\0");
	const names = [...identities].sort();
	return [text, names.length ? `() => [${names.join(", ")}]` : "null"];
}

/**
 * Transforms a module so that its components can be hot reloaded: a component
 * keeps its state when only what it renders is edited, and is remounted when
 * anything else in it is.
 *
 * The module is compiled to JavaScript first. After that the transform only
 * reads declarations and copies text: it never works out what a name in the
 * body of a loop refers to.
 */
export function compile(source: string, options: HotOptions): HotResult {
	const output = ts.transpileModule(source, {
		fileName: options.id,
		compilerOptions: {
			target: ts.ScriptTarget.ESNext,
			module: ts.ModuleKind.ESNext,
			jsx: ts.JsxEmit.React,
			jsxFactory: "createElement",
			jsxFragmentFactory: "Fragment",
			// Comments are not part of what a component is.
			removeComments: true,
			...options.compilerOptions,
			sourceMap: true,
			inlineSourceMap: false,
		},
	});
	const js = output.outputText.replace(/\n\/\/# sourceMappingURL=.*\s*$/, "\n");
	const rawMap = JSON.parse(output.sourceMapText!);
	rawMap.file = options.id;
	rawMap.sources = [options.id];
	rawMap.sourcesContent = [source];
	const map = JSON.stringify(rawMap);
	const sf = ts.createSourceFile(
		options.id + ".js",
		js,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.JS,
	);

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
		const isExport = hasModifier(stmt, ts.SyntaxKind.ExportKeyword);
		if (ts.isImportDeclaration(stmt)) {
			lastImportEnd = stmt.end;
			const clause = stmt.importClause;
			if (clause && clause.name) {
				bindings.set(clause.name.text, {kind: "identity"});
			}

			const named = clause && clause.namedBindings;
			if (named && ts.isNamespaceImport(named)) {
				bindings.set(named.name.text, {kind: "identity"});
			} else if (named) {
				for (const el of named.elements) {
					bindings.set(el.name.text, {kind: "identity"});
				}
			}
		} else if (ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) {
			if (!stmt.name) {
				const keyword = (stmt.modifiers || []).find(
					(m) => m.kind === ts.SyntaxKind.DefaultKeyword,
				);
				if (keyword && ts.isFunctionDeclaration(stmt) && stmt.body) {
					// The declaration becomes an expression.
					exported.add("default");
					components.push({
						name: "default",
						kind: getKind(stmt),
						fn: stmt,
						isDeclaration: false,
						start: keyword.end,
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

			if (ts.isFunctionDeclaration(stmt) && stmt.body && /^[A-Z]/.test(name)) {
				bindings.set(name, {kind: "stable"});
				components.push({
					name,
					kind: getKind(stmt),
					fn: stmt,
					isDeclaration: true,
					start: stmt.getStart(sf),
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
		} else if (ts.isExportDeclaration(stmt)) {
			const clause = stmt.exportClause;
			if (stmt.moduleSpecifier || !clause || !ts.isNamedExports(clause)) {
				isBoundary = false;
			} else {
				for (const el of clause.elements) {
					exported.add((el.propertyName || el.name).text);
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
				});
			} else {
				isBoundary = false;
			}
		}
	}

	if (!components.length && !calls.length && !(hashes && kept.length)) {
		return {code: js, map};
	}

	const edits: Array<Edit> = [];
	// Nothing is put on a line of its own, so that the lines of the module
	// are the lines which the compiler wrote.
	let header = `;import * as __hot from ${JSON.stringify(options.runtime)};`;
	for (const component of components) {
		const {fn, name} = component;
		const key = JSON.stringify(`${options.id}#${name}`);
		let signature = "";
		let viewArg = "null";
		let inputs = "null";
		if (component.kind !== "fn") {
			// A function component has nothing which outlives a render, so every
			// version of one is the same component.
			const loop = findLoop(fn.body as ts.Block);
			const view = loop && getView(sf, loop);
			const body = view && loop!.statement;
			const uses = new Set<string>();
			collectUses(fn, bindings, getLocals(fn, loop || fn.body!), body, uses);
			const [texts, values] = getInputs(sf, bindings, uses);
			inputs = values;
			if (view && body) {
				// The signature is the component without the body of its loop.
				signature = hash(
					component.kind +
						// A body with braces and one without are spaced differently.
						js.slice(fn.getStart(sf), body.getStart(sf)).trimEnd() +
						js.slice(body.end, fn.end).trimStart() +
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

				if (view.usesArguments) {
					// A getter would have arguments of its own.
					accessors += " __arguments: arguments,";
				}

				const start = fn.body!.getStart(sf) + 1;
				edits.push([start, start, ` __hot.mount(${key}, this);`]);
				const isBlock = ts.isBlock(body);
				const top = body.getStart(sf) + (isBlock ? 1 : 0);
				edits.push([
					top,
					top,
					`${isBlock ? "" : "{"} { const __view = __hot.view(${key}, () => ({__proto__: null,${accessors} }));` +
						` if (__view) { const __result = yield* __view.call(this);` +
						` if (__result === __hot.BREAK) break;` +
						` if (__result) return __result.value; continue; } } `,
				]);
				if (!isBlock) {
					edits.push([body.end, body.end, " }"]);
				}

				// Where the body is, for lining an edited view up with the map.
				const {line, character} = sf.getLineAndCharacterOfPosition(top);
				viewArg = `[${JSON.stringify(view.text)}, ${line}, ${character}]`;
			} else {
				signature = hash(component.kind + fn.getText(sf) + "\0" + texts);
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
			edits.push([fn.end, fn.end, ")"]);
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
		let [texts, values] = getInputs(sf, bindings, uses);
		let signature = hash(init.getText(sf) + "\0" + texts);
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

	let footer = "\nfunction __hotScope() { return {__proto__: null,";
	for (const name of bindings.keys()) {
		footer += ` get ${name}() { return ${name}; },`;
	}

	footer += ` }; }\n__hotScope.map = ${JSON.stringify(
		"data:application/json;base64," + Buffer.from(map).toString("base64"),
	)};\n__hotScope.id = ${JSON.stringify(options.id)};\n`;
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
	let code = js;
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
