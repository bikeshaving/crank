import ts from "typescript";

// For the mode of the transform which does not evaluate text. The body of a
// loop becomes a function in the module, so nothing resolves its names for
// it: every use of a variable of the component is rewritten to go through an
// object, which means working out which names are uses of them.

type Edit = [number, number, string];

function isLexical(list: ts.VariableDeclarationList): boolean {
	return !!(list.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const));
}

/** Whether an identifier is the name of something, and not a use of it. */
function isName(node: ts.Identifier): boolean {
	const parent = node.parent as any;
	return (
		(parent.name === node && !ts.isShorthandPropertyAssignment(parent)) ||
		parent.label === node ||
		parent.propertyName === node
	);
}

/**
 * Returns TypeScript's own account of what every name in a module refers
 * to. It is the part of the compiler which every TypeScript and JavaScript
 * editor uses, and it needs nothing but the one file.
 */
export function createChecker(sf: ts.SourceFile): ts.TypeChecker {
	const host: ts.CompilerHost = {
		getSourceFile: (name) => (name === sf.fileName ? sf : undefined),
		getDefaultLibFileName: () => "lib.d.ts",
		writeFile: () => {},
		getCurrentDirectory: () => "",
		getCanonicalFileName: (name) => name,
		useCaseSensitiveFileNames: () => true,
		getNewLine: () => "\n",
		fileExists: (name) => name === sf.fileName,
		readFile: () => undefined,
	};
	return ts
		.createProgram(
			[sf.fileName],
			{
				noLib: true,
				noResolve: true,
				allowJs: true,
				jsx: ts.JsxEmit.Preserve,
				target: ts.ScriptTarget.ESNext,
				module: ts.ModuleKind.ESNext,
			},
			host,
		)
		.getTypeChecker();
}

/**
 * Adds an edit for every use of a variable of the component in the body of
 * its loop, so that it goes through an object: `n` becomes `__locals.n`.
 *
 * A name is a use of a variable of the component when what it refers to is
 * declared in the component and outside the body. TypeScript says what each
 * name refers to, so this does not have rules of its own about scope.
 *
 * @param fn - The component.
 * @param object - The name of the object.
 * @returns The names of the variables which are used.
 */
export function rewriteLocals(
	sf: ts.SourceFile,
	checker: ts.TypeChecker,
	fn: ts.Node,
	body: ts.Node,
	object: string,
	edits: Array<Edit>,
): Set<string> {
	const used = new Set<string>();
	const isInside = (node: ts.Node, outer: ts.Node): boolean =>
		node.pos >= outer.pos && node.end <= outer.end;
	// A var which is declared in the body belongs to the component.
	const isVarOfComponent = (decl: ts.Node): boolean => {
		let isVar = false;
		for (let node = decl.parent; node; node = node.parent) {
			if (ts.isVariableDeclarationList(node)) {
				isVar = !isLexical(node);
			} else if (ts.isFunctionLike(node)) {
				return isVar && node === fn;
			}
		}

		return false;
	};

	const isLocal = (node: ts.Identifier): boolean => {
		const symbol = ts.isShorthandPropertyAssignment(node.parent)
			? checker.getShorthandAssignmentValueSymbol(node.parent)
			: checker.getSymbolAtLocation(node);
		for (const decl of (symbol && symbol.declarations) || []) {
			if (
				decl !== fn &&
				isInside(decl, fn) &&
				(!isInside(decl, body) || isVarOfComponent(decl))
			) {
				return true;
			}
		}

		return false;
	};

	// The functions between a name and the body which have arguments of
	// their own.
	let functions = 0;

	// The name of a var of the component, where it is declared in the body.
	const visitVarName = (name: ts.BindingName): void => {
		if (ts.isIdentifier(name)) {
			used.add(name.text);
			edits.push([name.getStart(sf), name.end, `${object}.${name.text}`]);
			return;
		}

		for (const el of name.elements) {
			if (ts.isOmittedExpression(el)) {
				continue;
			} else if (ts.isIdentifier(el.name) && !el.propertyName) {
				const text = el.name.text;
				used.add(text);
				edits.push([
					el.name.getStart(sf),
					el.name.end,
					// A name in an object is short for a property and a variable.
					ts.isObjectBindingPattern(name) && !el.dotDotDotToken
						? `${text}: ${object}.${text}`
						: `${object}.${text}`,
				]);
			} else {
				visitVarName(el.name);
			}

			if (el.propertyName && ts.isComputedPropertyName(el.propertyName)) {
				visit(el.propertyName, false);
			}

			if (el.initializer) {
				visit(el.initializer, false);
			}
		}
	};

	const visit = (node: ts.Node, inFunction: boolean): void => {
		if (ts.isTypeNode(node)) {
			return;
		} else if (ts.isIdentifier(node)) {
			const parent = node.parent as any;
			const name = node.text;
			if (isName(node)) {
				return;
			} else if (parent.tagName === node && /^[a-z]/.test(name)) {
				// The name of an element in JSX.
				return;
			} else if (name === "arguments" ? functions > 0 : !isLocal(node)) {
				return;
			}

			used.add(name);

			const target = `${object}.${name === "arguments" ? "__arguments" : name}`;
			const isCallee =
				(ts.isCallExpression(parent) && parent.expression === node) ||
				(ts.isTaggedTemplateExpression(parent) && parent.tag === node);
			// A function which is called through an object would have the
			// object as its `this`.
			edits.push([
				node.getStart(sf),
				node.end,
				isCallee ? `(0, ${target})` : target,
			]);
			return;
		} else if (ts.isShorthandPropertyAssignment(node)) {
			const name = node.name.text;
			if (isLocal(node.name)) {
				used.add(name);
				edits.push([
					node.name.getStart(sf),
					node.name.end,
					`${name}: ${object}.${name}`,
				]);
			}

			if (node.objectAssignmentInitializer) {
				visit(node.objectAssignmentInitializer, inFunction);
			}

			return;
		} else if (
			ts.isVariableDeclarationList(node) &&
			!isLexical(node) &&
			!inFunction
		) {
			// A var in the body is a variable of the component. A declaration
			// which assigns nothing is taken out, and the others are assigned to.
			const isRemoved =
				ts.isVariableStatement(node.parent) &&
				!node.declarations.some((d) => d.initializer);
			for (const decl of node.declarations) {
				if (!isRemoved) {
					visitVarName(decl.name);
				}

				if (decl.initializer) {
					visit(decl.initializer, inFunction);
				}
			}

			return;
		}

		// An arrow function has the arguments of what it is in.
		const hasArguments = ts.isFunctionLike(node) && !ts.isArrowFunction(node);
		functions += hasArguments ? 1 : 0;
		const inner = inFunction || ts.isFunctionLike(node);
		ts.forEachChild(node, (child) => visit(child, inner));
		functions -= hasArguments ? 1 : 0;
	};

	visit(body, false);
	return used;
}

/**
 * Returns the tokens of a part of a module, and whatever in it is written on
 * one line.
 */
function getTokens(
	sf: ts.SourceFile,
	node: ts.Node,
	from: number,
	to: number,
	tokens: Array<ts.Node>,
): void {
	if (node.end <= from || node.getStart(sf) >= to) {
		return;
	}

	const children = node.getChildren(sf);
	const isInside = node.getStart(sf) >= from && node.end <= to;
	// Something which is written on one line is copied as it is, so that
	// the spaces in it, which matter in JSX, are kept.
	if (!children.length || (isInside && !node.getText(sf).includes("\n"))) {
		if (isInside && node.getWidth(sf)) {
			tokens.push(node);
		}

		return;
	}

	for (const child of children) {
		getTokens(sf, child, from, to, tokens);
	}
}

// Statements which end with a semicolon, written or not.
function needsSemicolon(node: ts.Node): boolean {
	return (
		ts.isExpressionStatement(node) ||
		ts.isVariableStatement(node) ||
		ts.isReturnStatement(node) ||
		ts.isThrowStatement(node) ||
		ts.isBreakStatement(node) ||
		ts.isContinueStatement(node) ||
		ts.isDoStatement(node) ||
		ts.isDebuggerStatement(node)
	);
}

function collectEnds(
	sf: ts.SourceFile,
	node: ts.Node,
	from: number,
	to: number,
	ends: Set<number>,
): void {
	if (node.end <= from || node.getStart(sf) >= to) {
		return;
	} else if (needsSemicolon(node) && node.getStart(sf) >= from) {
		ends.add(node.end);
	}

	ts.forEachChild(node, (child) => collectEnds(sf, child, from, to, ends));
}

/**
 * Returns a part of a function as one line, without its comments, or
 * undefined when it cannot be written as one.
 *
 * What comes after the loop of a component is moved to before the body of
 * the loop. It has to be on the line the loop starts on, or every line of
 * the body would move.
 *
 * @param inserts - Text to put after the tokens which end at some places.
 */
export function collapse(
	sf: ts.SourceFile,
	fn: ts.Node,
	from: number,
	to: number,
	inserts: Map<number, string>,
): string | undefined {
	const tokens: Array<ts.Node> = [];
	getTokens(sf, fn, from, to, tokens);
	// Where a statement ends without a semicolon, the end of a line was one.
	const ends = new Set<number>();
	collectEnds(sf, fn, from, to, ends);
	let result = "";
	for (const token of tokens) {
		const text = token.getText(sf);
		if (
			text.includes("\n") ||
			token.kind === ts.SyntaxKind.JsxText ||
			token.kind === ts.SyntaxKind.JsxTextAllWhiteSpaces
		) {
			// A string over more than one line, or text in JSX, where the
			// spaces between tokens are part of what is written.
			return undefined;
		}

		result += " " + text;
		if (ends.has(token.end) && !text.endsWith(";")) {
			result += ";";
		}

		const insert = inserts.get(token.end);
		if (insert) {
			result += insert;
		}
	}

	return result;
}
