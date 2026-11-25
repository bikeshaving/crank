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
	/** Options for compiling TypeScript and JSX, which happens first. */
	compilerOptions?: ts.CompilerOptions;
}

interface Component {
	name: string;
	// "fn", "gen" or "agen".
	kind: string;
	// The function declaration, or the function which a const is declared with.
	fn: ts.FunctionLikeDeclaration;
	isDeclaration: boolean;
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
 * Collects the variables which are in scope at the loop of a function, and
 * whether each can be assigned to. This only reads declarations.
 */
function getLocals(
	fn: ts.FunctionLikeDeclaration,
	loop: ts.IterationStatement,
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

	collectVars(fn.body!);
	for (const name of names) {
		locals.set(name, true);
	}

	// The declarations of each block around the loop.
	for (let node: ts.Node = loop; node !== fn; node = node.parent) {
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

	const init = (loop as ts.ForOfStatement).initializer;
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
 * undefined when it cannot be run as one. Statements which leave the loop
 * become return statements, which the loop acts on.
 */
function getView(
	sf: ts.SourceFile,
	loop: ts.IterationStatement,
): string | undefined {
	const body = loop.statement;
	if (!ts.isBlock(body)) {
		return undefined;
	}

	const label = ts.isLabeledStatement(loop.parent)
		? loop.parent.label.text
		: undefined;
	const edits: Array<Edit> = [];
	let ok = true;
	const visit = (
		node: ts.Node,
		inLoop: boolean,
		inSwitch: boolean,
		labels: Array<string>,
	): void => {
		if (ts.isIdentifier(node) && node.text === "arguments") {
			// The arguments of the component are not those of the view.
			ok = false;
		}

		if (ts.isFunctionLike(node)) {
			// A return in an arrow function is not a return from the component,
			// but its arguments are those of the component.
			if (ts.isArrowFunction(node)) {
				ts.forEachChild(node, (child) => visit(child, true, true, ["*"]));
			}

			return;
		} else if (ts.isVariableDeclarationList(node) && !isLexical(node)) {
			// A var in the loop keeps its value between iterations.
			ok = false;
		} else if (ts.isReturnStatement(node) && !labels.includes("*")) {
			const value = node.expression ? node.expression.getText(sf) : "undefined";
			edits.push([node.getStart(sf), node.end, `return {value: (${value})};`]);
			return;
		} else if (ts.isBreakStatement(node) || ts.isContinueStatement(node)) {
			const isBreak = ts.isBreakStatement(node);
			const leaves = node.label
				? node.label.text === label
				: !inLoop && !(isBreak && inSwitch);
			if (node.label && !leaves && !labels.includes(node.label.text)) {
				// A label outside the loop.
				ok = false;
			} else if (leaves && labels.includes("*")) {
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
		ts.forEachChild(node, (child) => visit(child, loops, switches, labels));
	};

	for (const stmt of body.statements) {
		visit(stmt, false, false, []);
	}

	if (!ok) {
		return undefined;
	}

	const start = body.getStart(sf) + 1;
	let text = sf.text.slice(start, body.end - 1);
	edits.sort((a, b) => b[0] - a[0]);
	for (const [from, to, replacement] of edits) {
		text = text.slice(0, from - start) + replacement + text.slice(to - start);
	}

	return text;
}

/**
 * Transforms a module so that its components can be hot reloaded: a component
 * keeps its state when only what it renders is edited, and is remounted when
 * anything else in it is.
 *
 * The module is compiled to JavaScript first. After that the transform only
 * reads declarations and copies text: it never works out what a name in the
 * body of a component refers to.
 */
export function transform(source: string, options: HotOptions): string {
	const js = ts.transpileModule(source, {
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
		},
	}).outputText;
	const sf = ts.createSourceFile(
		options.id + ".js",
		js,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.JS,
	);

	// The bindings of the module, and what it exports.
	const moduleNames: Array<string> = [];
	const exported = new Set<string>();
	const components: Array<Component> = [];
	let isBoundary = true;
	let lastImportEnd = 0;
	for (const stmt of sf.statements) {
		const isExport = hasModifier(stmt, ts.SyntaxKind.ExportKeyword);
		if (ts.isImportDeclaration(stmt)) {
			lastImportEnd = stmt.end;
			const clause = stmt.importClause;
			if (clause && clause.name) {
				moduleNames.push(clause.name.text);
			}

			const bindings = clause && clause.namedBindings;
			if (bindings && ts.isNamespaceImport(bindings)) {
				moduleNames.push(bindings.name.text);
			} else if (bindings) {
				for (const el of bindings.elements) {
					moduleNames.push(el.name.text);
				}
			}
		} else if (ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) {
			if (!stmt.name) {
				// A default export without a name cannot be registered.
				isBoundary = false;
				continue;
			}

			const name = stmt.name.text;
			moduleNames.push(name);
			if (isExport) {
				exported.add(name);
			}

			if (ts.isFunctionDeclaration(stmt) && stmt.body && /^[A-Z]/.test(name)) {
				components.push({
					name,
					kind: !stmt.asteriskToken
						? "fn"
						: hasModifier(stmt, ts.SyntaxKind.AsyncKeyword)
							? "agen"
							: "gen",
					fn: stmt,
					isDeclaration: true,
				});
			}
		} else if (ts.isVariableStatement(stmt)) {
			for (const decl of stmt.declarationList.declarations) {
				const names: Array<string> = [];
				getBindingNames(decl.name, names);
				for (const name of names) {
					moduleNames.push(name);
					if (isExport) {
						exported.add(name);
					}
				}

				const init = decl.initializer;
				if (
					ts.isIdentifier(decl.name) &&
					/^[A-Z]/.test(decl.name.text) &&
					stmt.declarationList.flags & ts.NodeFlags.Const &&
					init &&
					(ts.isArrowFunction(init) || ts.isFunctionExpression(init))
				) {
					components.push({
						name: decl.name.text,
						kind: !init.asteriskToken
							? "fn"
							: hasModifier(init, ts.SyntaxKind.AsyncKeyword)
								? "agen"
								: "gen",
						fn: init,
						isDeclaration: false,
					});
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
			if (ts.isIdentifier(stmt.expression)) {
				exported.add(stmt.expression.text);
			} else {
				isBoundary = false;
			}
		}
	}

	if (!components.length) {
		return js;
	}

	const edits: Array<Edit> = [];
	let header = `\nimport * as __hot from ${JSON.stringify(options.runtime)};\n`;
	for (const component of components) {
		const {fn, name} = component;
		const key = JSON.stringify(`${options.id}#${name}`);
		let view: string | undefined;
		let signature = hash(component.kind + fn.getText(sf));
		const loop =
			component.kind === "fn" ? undefined : findLoop(fn.body as ts.Block);
		if (component.kind === "fn") {
			// Nothing in a function component outlives a render.
			signature = "";
		} else if (loop) {
			view = getView(sf, loop);
		}

		if (loop && view !== undefined) {
			// The signature is the component without the body of its loop.
			const body = loop.statement;
			signature = hash(
				component.kind +
					js.slice(fn.getStart(sf), body.getStart(sf)) +
					js.slice(body.end, fn.end),
			);

			let accessors = "";
			for (const [local, isWritable] of getLocals(fn, loop)) {
				accessors += ` get ${local}() { return ${local}; },`;
				if (isWritable) {
					accessors += ` set ${local}(__value) { ${local} = __value; },`;
				}
			}

			const start = fn.body!.getStart(sf) + 1;
			edits.push([start, start, ` __hot.mount(${key}, this);`]);
			const top = body.getStart(sf) + 1;
			edits.push([
				top,
				top,
				` { const __view = __hot.view(${key}, () => ({__proto__: null,${accessors} }));` +
					` if (__view) { const __result = yield* __view.call(this);` +
					` if (__result === __hot.BREAK) break;` +
					` if (__result) return __result.value; continue; } }`,
			]);
		}

		const args = `${key}, ${JSON.stringify(component.kind)}, ${JSON.stringify(
			signature,
		)}, ${view === undefined ? "null" : JSON.stringify(view)}, __hotScope, `;
		if (component.isDeclaration) {
			// Function declarations are hoisted, so the binding holds what the
			// runtime returns before anything in the module runs.
			header += `${name} = __hot.register(${args}${name});\n`;
		} else {
			edits.push([fn.getStart(sf), fn.getStart(sf), `__hot.register(${args}`]);
			edits.push([fn.end, fn.end, ")"]);
		}
	}

	let footer = "\nfunction __hotScope() { return {__proto__: null,";
	for (const name of new Set(moduleNames)) {
		footer += ` get ${name}() { return ${name}; },`;
	}

	footer += " }; }\n";
	// A module which exports anything other than components cannot be
	// replaced on its own, because what imports it would keep the old exports.
	const names = new Set(components.map((c) => c.name));
	if (
		options.accept &&
		isBoundary &&
		[...exported].every((e) => names.has(e))
	) {
		footer += "if (import.meta.hot) { import.meta.hot.accept(); }\n";
	}

	edits.push([lastImportEnd, lastImportEnd, header]);
	edits.sort((a, b) => b[0] - a[0]);
	let out = js;
	for (const [start, end, text] of edits) {
		out = out.slice(0, start) + text + out.slice(end);
	}

	return out + footer;
}
