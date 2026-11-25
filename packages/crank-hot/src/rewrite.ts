import ts from "typescript";

// For the mode of the transform which does not evaluate text. The body of a
// loop becomes a function in the module, so nothing resolves its names for
// it: every use of a variable of the component is rewritten to go through an
// object, which means working out which names are uses of them.

type Edit = [number, number, string];

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

// The vars of a function, which belong to all of it.
function collectVars(node: ts.Node, names: Array<string>): void {
	if (ts.isFunctionLike(node)) {
		return;
	} else if (ts.isVariableDeclarationList(node) && !isLexical(node)) {
		for (const decl of node.declarations) {
			getBindingNames(decl.name, names);
		}
	}

	ts.forEachChild(node, (child) => collectVars(child, names));
}

// What the statements of a block declare for the block.
function collectLexical(
	statements: Iterable<ts.Statement>,
	names: Array<string>,
): void {
	for (const stmt of statements) {
		if (
			(ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) &&
			stmt.name
		) {
			names.push(stmt.name.text);
		} else if (
			ts.isVariableStatement(stmt) &&
			isLexical(stmt.declarationList)
		) {
			for (const decl of stmt.declarationList.declarations) {
				getBindingNames(decl.name, names);
			}
		}
	}
}

/**
 * Returns the names which a node declares for what is inside it, or
 * undefined if it does not make a scope.
 */
function getScope(node: ts.Node): Array<string> | undefined {
	const names: Array<string> = [];
	if (ts.isBlock(node) || ts.isModuleBlock(node)) {
		collectLexical(node.statements, names);
	} else if (ts.isCaseBlock(node)) {
		for (const clause of node.clauses) {
			collectLexical(clause.statements, names);
		}
	} else if (ts.isFunctionLike(node)) {
		for (const param of node.parameters) {
			getBindingNames(param.name, names);
		}

		if (ts.isFunctionExpression(node) && node.name) {
			names.push(node.name.text);
		}

		const body = (node as ts.FunctionLikeDeclaration).body;
		if (body) {
			collectVars(body, names);
		}

		// A function has arguments of its own, unless it is an arrow function.
		if (!ts.isArrowFunction(node)) {
			names.push("arguments");
		}
	} else if (ts.isCatchClause(node)) {
		if (node.variableDeclaration) {
			getBindingNames(node.variableDeclaration.name, names);
		}
	} else if (
		ts.isForStatement(node) ||
		ts.isForInStatement(node) ||
		ts.isForOfStatement(node)
	) {
		const init = node.initializer;
		if (init && ts.isVariableDeclarationList(init) && isLexical(init)) {
			for (const decl of init.declarations) {
				getBindingNames(decl.name, names);
			}
		}
	} else if (ts.isClassLike(node)) {
		if (node.name) {
			names.push(node.name.text);
		}
	} else {
		return undefined;
	}

	return names;
}

/**
 * Adds an edit for every use of a variable of the component in the body of
 * its loop, so that it goes through an object: `n` becomes `__locals.n`.
 *
 * A name is a use of a variable of the component when the component has a
 * variable with that name in scope at the loop, and nothing between the use
 * and the body declares the name again.
 *
 * @param locals - The variables in scope at the loop.
 * @param object - The name of the object.
 */
export function rewriteLocals(
	sf: ts.SourceFile,
	body: ts.Node,
	locals: Map<string, boolean>,
	object: string,
	edits: Array<Edit>,
): void {
	// The names which are declared again, from the body inwards.
	const shadows: Array<Array<string>> = [];
	const isLocal = (name: string): boolean => {
		if (!locals.has(name) && name !== "arguments") {
			return false;
		}

		for (const names of shadows) {
			if (names.includes(name)) {
				return false;
			}
		}

		return true;
	};

	// The name of a var of the component, where it is declared in the body.
	const visitVarName = (name: ts.BindingName): void => {
		if (ts.isIdentifier(name)) {
			edits.push([name.getStart(sf), name.end, `${object}.${name.text}`]);
			return;
		}

		for (const el of name.elements) {
			if (ts.isOmittedExpression(el)) {
				continue;
			} else if (ts.isIdentifier(el.name) && !el.propertyName) {
				const text = el.name.text;
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
			if (isName(node) || !isLocal(name)) {
				return;
			} else if (parent.tagName === node && /^[a-z]/.test(name)) {
				// The name of an element in JSX.
				return;
			}

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
			if (isLocal(name)) {
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

		const scope = getScope(node);
		if (scope) {
			shadows.push(scope);
		}

		const inner = inFunction || ts.isFunctionLike(node);
		ts.forEachChild(node, (child) => visit(child, inner));
		if (scope) {
			shadows.pop();
		}
	};

	visit(body, false);
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
