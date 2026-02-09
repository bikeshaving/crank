import {getNodeText} from "./ast-utils.js";
import {SourceCode} from "eslint";
import {ESLintNode} from "./types.js";

/**
 * Indentation constants
 */
const INDENT_SIZE = 2;
const INDENT_LEVEL_1 = INDENT_SIZE; // One level of indentation
const INDENT_LEVEL_2 = INDENT_SIZE * 2; // Two levels of indentation

/**
 * Extract the callback body text without the specified refresh call statements
 */
export function extractCallbackBodyWithoutRefresh(
	callbackNode: ESLintNode,
	refreshStatements: ESLintNode[],
	sourceCode: SourceCode,
): string {
	if (callbackNode.body.type !== "BlockStatement") {
		return "/* your code */";
	}

	const statements = callbackNode.body.body;

	if (statements.length === 0) {
		return "/* your code */";
	}

	// Create a set of refresh statement nodes to skip
	const refreshStatementsSet = new Set(
		refreshStatements.filter((s) => s !== null),
	);

	// Recursively process statements and remove refresh calls
	function processStatement(stmt: any): string | null {
		// Skip if this is a refresh statement to remove
		if (refreshStatementsSet.has(stmt)) {
			return null;
		}

		// Get the statement text
		const stmtText = getNodeText(stmt, sourceCode);

		// If this is a try/catch/finally statement, process it recursively
		if (stmt.type === "TryStatement") {
			const parts: string[] = [];

			// Process try block
			parts.push("try {");
			if (stmt.block && stmt.block.body) {
				for (const s of stmt.block.body) {
					const processed = processStatement(s);
					if (processed) {
						parts.push(processed);
					}
				}
			}

			// Process catch block
			if (stmt.handler) {
				const param = stmt.handler.param
					? ` (${getNodeText(stmt.handler.param, sourceCode)})`
					: "";
				parts.push(`} catch${param} {`);
				if (stmt.handler.body && stmt.handler.body.body) {
					for (const s of stmt.handler.body.body) {
						const processed = processStatement(s);
						if (processed) {
							parts.push(processed);
						}
					}
				}
			}

			// Process finally block
			if (stmt.finalizer) {
				parts.push("} finally {");
				if (stmt.finalizer.body) {
					for (const s of stmt.finalizer.body) {
						const processed = processStatement(s);
						if (processed) {
							parts.push(processed);
						}
					}
				}
			}

			parts.push("}");

			return parts.join("\n");
		}

		// If this is an if statement, process it recursively
		if (stmt.type === "IfStatement") {
			const parts: string[] = [];

			// Get the test condition
			const test = getNodeText(stmt.test, sourceCode);
			parts.push(`if (${test}) {`);

			// Process consequent (the 'if' block)
			if (stmt.consequent) {
				if (stmt.consequent.type === "BlockStatement") {
					for (const s of stmt.consequent.body) {
						const processed = processStatement(s);
						if (processed) {
							parts.push(processed);
						}
					}
				} else {
					// Single statement without braces
					const processed = processStatement(stmt.consequent);
					if (processed) {
						parts.push(processed);
					}
				}
			}

			// Process alternate (the 'else' block)
			if (stmt.alternate) {
				if (stmt.alternate.type === "IfStatement") {
					// else if
					parts.push("} " + processStatement(stmt.alternate));
				} else if (stmt.alternate.type === "BlockStatement") {
					parts.push("} else {");
					for (const s of stmt.alternate.body) {
						const processed = processStatement(s);
						if (processed) {
							parts.push(processed);
						}
					}
					parts.push("}");
				} else {
					// Single statement without braces
					parts.push("} else");
					const processed = processStatement(stmt.alternate);
					if (processed) {
						parts.push(processed);
					}
				}
			} else {
				parts.push("}");
			}

			return parts.join("\n");
		}

		// For other statements, return the text as-is
		return stmtText;
	}

	// Process all top-level statements
	const processedStatements = statements
		.map((stmt: any) => processStatement(stmt))
		.filter((text: string | null) => text !== null);

	if (processedStatements.length === 0) {
		return "/* your code */";
	}

	// Join statements and clean up whitespace
	const result = processedStatements
		.join("\n")
		.split("\n")
		.map((line: string) => line.trim())
		.filter((line: string) => line.length > 0)
		.join("\n");

	return result || "/* your code */";
}

/**
 * Normalize indentation of extracted code to match the target context
 */
export function normalizeIndentation(
	code: string,
	targetIndentation: number = 0,
): string {
	if (!code || code === "/* your code */") {
		return code;
	}

	const lines = code.split("\n");
	let currentIndent = 0;

	const normalizedLines = lines.map((line: string) => {
		const trimmed = line.trim();
		if (trimmed.length === 0) return "";

		// Handle indentation changes based on block structure
		if (trimmed.startsWith("} catch") || trimmed.startsWith("} finally")) {
			// catch/finally blocks - decrease indent first, then indent the line
			currentIndent = Math.max(0, currentIndent - INDENT_SIZE);
			const indent = " ".repeat(targetIndentation + currentIndent);
			currentIndent += INDENT_SIZE; // Increase indent for the catch/finally block content
			return indent + trimmed;
		} else if (trimmed.endsWith("{")) {
			// Opening brace - indent the current line and increase indent for next lines
			const indent = " ".repeat(targetIndentation + currentIndent);
			currentIndent += INDENT_SIZE;
			return indent + trimmed;
		} else if (trimmed === "}") {
			// Closing brace - decrease indent and indent the current line
			currentIndent = Math.max(0, currentIndent - INDENT_SIZE);
			const indent = " ".repeat(targetIndentation + currentIndent);
			return indent + trimmed;
		} else {
			// Regular line - use current indent level
			const indent = " ".repeat(targetIndentation + currentIndent);
			return indent + trimmed;
		}
	});

	return normalizedLines.join("\n");
}

/**
 * Format callback body text with proper indentation
 */
export function formatCallbackBodyWithIndentation(
	bodyText: string,
	baseIndentation: number = INDENT_SIZE,
): string {
	if (!bodyText || bodyText === "/* your code */") {
		return bodyText;
	}

	// Use normalizeIndentation for proper nested block handling
	return normalizeIndentation(bodyText, baseIndentation);
}

/**
 * Get the indentation level of a node in the source code
 */
export function getNodeIndentation(
	node: ESLintNode,
	sourceCode: SourceCode,
): number {
	// Get the start position of the node
	const start = node.range?.[0] ?? 0;
	const lines = sourceCode.getText().split("\n");

	// Find which line the node starts on
	let currentPos = 0;
	let lineIndex = 0;

	for (let i = 0; i < lines.length; i++) {
		const lineLength = lines[i].length + 1; // +1 for newline
		if (currentPos + lineLength > start) {
			lineIndex = i;
			break;
		}
		currentPos += lineLength;
	}

	// Get the indentation of the line where the node starts
	const line = lines[lineIndex];
	return line.length - line.trimStart().length;
}

/**
 * Generate the new callback text with proper formatting
 */
export function generateCallbackText(
	callbackParams: string,
	contextRef: string,
	asyncKeyword: string,
	bodyText: string,
	baseIndentation: number = 0,
	includeSemicolon: boolean = true,
): string {
	// Apply the exact transformation pattern:
	// [X]const callback = () => {          → [X]const callback = () => this.refresh(
	// [X+2]doSomething();                 → [X+2]() => {
	// [X+2]this.refresh();                → [X+4]doSomething();
	// [X]};                               → [X+2]}
	//                                     → [X]);

	// Use formatCallbackBodyWithIndentation for simple indentation
	const formattedBody = formatCallbackBodyWithIndentation(
		bodyText,
		baseIndentation + INDENT_LEVEL_2,
	);

	const arrowFunctionIndent = " ".repeat(baseIndentation + INDENT_LEVEL_1);
	const closingBraceIndent = " ".repeat(baseIndentation + INDENT_LEVEL_1);
	const closingIndent = " ".repeat(baseIndentation);

	const semicolon = includeSemicolon ? ";" : "";

	return `${callbackParams} => ${contextRef}.refresh(
${arrowFunctionIndent}${asyncKeyword}() => {
${formattedBody}
${closingBraceIndent}}
${closingIndent})${semicolon}`;
}

/**
 * Find the parent ExpressionStatement of a refresh call node
 */
export function findRefreshStatementParent(
	node: ESLintNode,
): ESLintNode | null {
	let current = node.parent;
	while (current && current.type !== "ExpressionStatement") {
		current = current.parent;
	}
	return current || null;
}
