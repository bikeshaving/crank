import {describe, it, expect} from "vitest";
import {
	extractCallbackBodyWithoutRefresh,
	formatCallbackBodyWithIndentation,
	getNodeIndentation,
	generateCallbackText,
	findRefreshStatementParent,
} from "./callback-formatters.js";
import {
	createMockStatement,
	createMockCallbackNode,
} from "../test-helpers/test-utils.js";

describe("callback-formatters", () => {
	describe("extractCallbackBodyWithoutRefresh", () => {
		it("should extract callback body without the refresh statement", () => {
			// Mock callback node with statements
			const mockCallbackNode = createMockCallbackNode([
				createMockStatement("ExpressionStatement", "await doSomething();"),
				createMockStatement("ExpressionStatement", "this.refresh();"),
				createMockStatement("ReturnStatement", "return;"),
			]);

			const mockRefreshStatement = mockCallbackNode.body.body[1];
			const mockSourceCode = {
				getText: (node: any) => node.text,
			};

			const result = extractCallbackBodyWithoutRefresh(
				mockCallbackNode,
				[mockRefreshStatement],
				mockSourceCode,
			);

			expect(result).toBe("await doSomething();\nreturn;");
		});

		it("should return placeholder for non-block statements", () => {
			const mockCallbackNode = {
				body: {type: "ExpressionStatement"},
			};

			const result = extractCallbackBodyWithoutRefresh(
				mockCallbackNode,
				[],
				null,
			);

			expect(result).toBe("/* your code */");
		});

		it("should return placeholder when no statements remain", () => {
			const mockCallbackNode = createMockCallbackNode([
				createMockStatement("ExpressionStatement", "this.refresh();"),
			]);

			const mockRefreshStatement = mockCallbackNode.body.body[0];
			const mockSourceCode = {
				getText: (node: any) => node.text,
			};

			const result = extractCallbackBodyWithoutRefresh(
				mockCallbackNode,
				[mockRefreshStatement],
				mockSourceCode,
			);

			expect(result).toBe("/* your code */");
		});
	});

	describe("formatCallbackBodyWithIndentation", () => {
		it("should add proper indentation to callback body", () => {
			const bodyText = "await doSomething();\nreturn;";
			const result = formatCallbackBodyWithIndentation(bodyText, 2);

			expect(result).toBe("  await doSomething();\n  return;");
		});

		it("should handle empty or placeholder text", () => {
			expect(formatCallbackBodyWithIndentation("", 2)).toBe("");
			expect(formatCallbackBodyWithIndentation("/* your code */", 2)).toBe(
				"/* your code */",
			);
		});

		it("should handle block structure properly", () => {
			const bodyText =
				"try {\nawait doSomething();\n} catch (e) {\nthrow e;\n}";
			const result = formatCallbackBodyWithIndentation(bodyText, 2);

			// The normalizeIndentation function handles nested blocks
			expect(result).toContain("try {");
			expect(result).toContain("} catch (e) {");
		});
	});

	describe("getNodeIndentation", () => {
		it("should return correct indentation level", () => {
			const mockNode = {text: "    await doSomething();", range: [0, 20]};
			const mockSourceCode = {
				getText: () => mockNode.text,
			};

			const result = getNodeIndentation(mockNode, mockSourceCode);
			expect(result).toBe(4);
		});

		it("should handle nodes with no indentation", () => {
			const mockNode = {text: "await doSomething();", range: [0, 18]};
			const mockSourceCode = {
				getText: () => mockNode.text,
			};

			const result = getNodeIndentation(mockNode, mockSourceCode);
			expect(result).toBe(0);
		});
	});

	describe("generateCallbackText", () => {
		it("should generate properly formatted callback text", () => {
			const result = generateCallbackText(
				"(e: Event)",
				"ctx",
				"async ",
				"await doSomething();\nreturn;",
				0,
			);

			expect(result).toBe(`(e: Event) => ctx.refresh(
  async () => {
    await doSomething();
    return;
  }
);`);
		});

		it("should handle base indentation", () => {
			const result = generateCallbackText(
				"()",
				"this",
				"",
				"doSomething();",
				4,
			);

			expect(result).toBe(`() => this.refresh(
      () => {
        doSomething();
      }
    );`);
		});
	});

	describe("findRefreshStatementParent", () => {
		it("should find ExpressionStatement parent", () => {
			const mockNode = {
				type: "CallExpression",
				parent: {
					type: "ExpressionStatement",
					parent: {type: "BlockStatement"},
				},
			};

			const result = findRefreshStatementParent(mockNode);
			expect(result).toBe(mockNode.parent);
		});

		it("should traverse up the tree to find ExpressionStatement", () => {
			const mockNode = {
				type: "CallExpression",
				parent: {
					type: "MemberExpression",
					parent: {
						type: "ExpressionStatement",
						parent: {type: "BlockStatement"},
					},
				},
			};

			const result = findRefreshStatementParent(mockNode);
			expect(result).toBe(mockNode.parent.parent);
		});

		it("should return null if no ExpressionStatement found", () => {
			const mockNode = {
				type: "CallExpression",
				parent: {
					type: "MemberExpression",
					parent: {type: "BlockStatement"},
				},
			};

			const result = findRefreshStatementParent(mockNode);
			expect(result).toBeNull();
		});
	});
});
