module.exports = {
	configs: {
		recommended: {
			plugins: ["react"],
			settings: {
				react: {
					pragma: "createElement",
					fragment: "Fragment",
				},
			},
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
			rules: {
				// A common Crank idiom is to destructure the context iterator values
				// with an empty pattern.
				//   for (const {} of this) {}
				// TODO: Write a rule that checks for empty patterns outside of this
				// context.
				"no-empty-pattern": 0,
				"crank/generator-destructuring-consistency": 2,
				"react/jsx-uses-react": 2,
				"react/jsx-uses-vars": 2,
				"react/jsx-no-undef": 2,
				"react/jsx-no-duplicate-props": 2,
			},
		},
	},
	rules: {
		"generator-destructuring-consistency": {
			meta: {
				type: "problem",
				docs: {
					description:
						"Enforce consistent destructuring between generator function parameters and for-loop patterns",
					category: "Best Practices",
					recommended: true,
				},
				fixable: "code",
				schema: [],
				messages: {
					inconsistentDestructuring:
						"Generator component destructuring patterns should be consistent between function parameters and for-loop. Expected {{expected}}, but got {{actual}}.",
				},
			},
			create(context) {
				function getDestructuringKeys(node) {
					if (!node || node.type !== "ObjectPattern") return null;
					return node.properties
						.map((prop) => {
							if (prop.type === "Property" && prop.key.type === "Identifier") {
								return prop.key.name;
							}
							return null;
						})
						.filter(Boolean)
						.sort();
				}

				function getDestructuringText(keys) {
					if (!keys || keys.length === 0) return "{}";
					return `{${keys.join(", ")}}`;
				}

				function isGeneratorFunction(node) {
					return (
						(node.type === "FunctionDeclaration" && node.generator) ||
						(node.type === "FunctionExpression" && node.generator) ||
						(node.type === "ArrowFunctionExpression" && node.generator)
					);
				}

				function findThisContextLoops(functionNode) {
					const loops = [];
					const secondParamName =
						functionNode.params[1] &&
						functionNode.params[1].type === "Identifier"
							? functionNode.params[1].name
							: null;

					function visit(node) {
						if (!node) return;

						// Check for "for (...) of this" or "for await (...) of this" patterns
						// Also check for "for (...) of ctx" where ctx is the second parameter
						if (
							(node.type === "ForOfStatement" ||
								node.type === "ForAwaitStatement") &&
							node.right
						) {
							// Match "for (...) of this"
							if (node.right.type === "ThisExpression") {
								loops.push(node);
							}
							// Match "for (...) of ctx" where ctx is second parameter
							else if (
								secondParamName &&
								node.right.type === "Identifier" &&
								node.right.name === secondParamName
							) {
								loops.push(node);
							}
						}

						// Recursively visit child nodes
						for (const key in node) {
							if (key === "parent") continue;
							const child = node[key];
							if (Array.isArray(child)) {
								child.forEach(visit);
							} else if (child && typeof child === "object") {
								visit(child);
							}
						}
					}

					visit(functionNode.body);
					return loops;
				}

				return {
					FunctionDeclaration(node) {
						if (!isGeneratorFunction(node)) return;

						// Only check functions with uppercase names (component-like)
						if (!node.id || !node.id.name || !/^[A-Z]/.test(node.id.name))
							return;

						// Require first parameter to be destructured (props pattern)
						const firstParam = node.params[0];
						if (!firstParam || firstParam.type !== "ObjectPattern") return;

						const paramKeys = getDestructuringKeys(firstParam);
						if (!paramKeys) return;

						// Find all "for (...) of this" loops in this generator
						const thisLoops = findThisContextLoops(node);

						// Check each loop's destructuring pattern
						thisLoops.forEach((loop) => {
							const loopPattern = loop.left;
							let loopKeys = null;

							// Handle different loop destructuring patterns
							if (loopPattern.type === "ObjectPattern") {
								loopKeys = getDestructuringKeys(loopPattern);
							} else if (loopPattern.type === "VariableDeclaration") {
								const declarator = loopPattern.declarations[0];
								if (declarator && declarator.id.type === "ObjectPattern") {
									loopKeys = getDestructuringKeys(declarator.id);
								}
							}

							if (
								loopKeys !== null &&
								JSON.stringify(paramKeys) !== JSON.stringify(loopKeys)
							) {
								context.report({
									node: loop,
									messageId: "inconsistentDestructuring",
									data: {
										expected: getDestructuringText(paramKeys),
										actual: getDestructuringText(loopKeys),
									},
									fix(fixer) {
										// Generate the correct destructuring pattern
										const expectedPattern = getDestructuringText(paramKeys);

										if (loopPattern.type === "ObjectPattern") {
											return fixer.replaceText(loopPattern, expectedPattern);
										} else if (loopPattern.type === "VariableDeclaration") {
											const declarator = loopPattern.declarations[0];
											const keyword = loopPattern.kind || "const";
											return fixer.replaceText(
												loopPattern,
												`${keyword} ${expectedPattern}`,
											);
										}
										return null;
									},
								});
							}
						});
					},

					FunctionExpression(node) {
						if (!isGeneratorFunction(node)) return;

						// For function expressions, we can't check the name easily
						// but we still require first parameter to be destructured
						const firstParam = node.params[0];
						if (!firstParam || firstParam.type !== "ObjectPattern") return;

						const paramKeys = getDestructuringKeys(firstParam);
						if (!paramKeys) return;

						// Find all "for (...) of this" loops in this generator
						const thisLoops = findThisContextLoops(node);

						// Check each loop's destructuring pattern
						thisLoops.forEach((loop) => {
							const loopPattern = loop.left;
							let loopKeys = null;

							// Handle different loop destructuring patterns
							if (loopPattern.type === "ObjectPattern") {
								loopKeys = getDestructuringKeys(loopPattern);
							} else if (loopPattern.type === "VariableDeclaration") {
								const declarator = loopPattern.declarations[0];
								if (declarator && declarator.id.type === "ObjectPattern") {
									loopKeys = getDestructuringKeys(declarator.id);
								}
							}

							if (
								loopKeys !== null &&
								JSON.stringify(paramKeys) !== JSON.stringify(loopKeys)
							) {
								context.report({
									node: loop,
									messageId: "inconsistentDestructuring",
									data: {
										expected: getDestructuringText(paramKeys),
										actual: getDestructuringText(loopKeys),
									},
									fix(fixer) {
										// Generate the correct destructuring pattern
										const expectedPattern = getDestructuringText(paramKeys);

										if (loopPattern.type === "ObjectPattern") {
											return fixer.replaceText(loopPattern, expectedPattern);
										} else if (loopPattern.type === "VariableDeclaration") {
											const declarator = loopPattern.declarations[0];
											const keyword = loopPattern.kind || "const";
											return fixer.replaceText(
												loopPattern,
												`${keyword} ${expectedPattern}`,
											);
										}
										return null;
									},
								});
							}
						});
					},
				};
			},
		},
	},
};
