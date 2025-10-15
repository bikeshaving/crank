import type { RuleTester } from "eslint";

/**
 * Creates a standard error object for test cases
 */
export function createError(
  messageId: string,
  data?: Record<string, string>
): RuleTester.TestCaseError {
  return {
    messageId,
    ...(data && { data }),
  } as RuleTester.TestCaseError;
}

/**
 * Creates an invalid test case with code, output, and errors
 */
export function createInvalidTest(
  code: string,
  output: string,
  errors: RuleTester.TestCaseError[]
): RuleTester.InvalidTestCase {
  return {
    code,
    output,
    errors,
  };
}

/**
 * Creates a mock AST statement node for testing
 */
export function createMockStatement(type: string, text: string) {
  return { type, text };
}

/**
 * Creates a mock callback node with a block statement body
 */
export function createMockCallbackNode(
  statements: Array<{ type: string; text: string }>
) {
  return {
    body: {
      type: "BlockStatement",
      body: statements,
    },
  };
}

/**
 * Helper to test JavaScript compatibility for a rule
 */
export function testJsCompatibility(
  createRuleTester: () => RuleTester,
  ruleName: string,
  rule: any,
  testCase: { valid: RuleTester.ValidTestCase[]; invalid: RuleTester.InvalidTestCase[] }
): void {
  const jsRuleTester = createRuleTester();
  jsRuleTester.run(ruleName, rule, testCase);
}
