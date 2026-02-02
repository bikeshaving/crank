import {Parser} from "acorn";
import {tsPlugin} from "@sveltejs/acorn-typescript";
import jsx from "acorn-jsx";
import {generate, baseGenerator} from "astring";
import type * as ESTree from "estree";

// Extend the parser with TypeScript and JSX support
const TypeScriptParser = Parser.extend(tsPlugin(), jsx());

// Track loop IDs for unique variable names
let loopId = 0;

/**
 * Custom astring generator that handles TypeScript AST nodes.
 * TypeScript-specific nodes are either skipped or have their JS parts extracted.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tsGenerator: any = {
	...baseGenerator,

	// === Type Annotations (skip entirely) ===
	TSTypeAnnotation() {},
	TSTypeParameterDeclaration() {},
	TSTypeParameterInstantiation() {},
	TSTypeReference() {},
	TSTypeLiteral() {},
	TSArrayType() {},
	TSTupleType() {},
	TSUnionType() {},
	TSIntersectionType() {},
	TSFunctionType() {},
	TSParenthesizedType() {},
	TSIndexedAccessType() {},
	TSMappedType() {},
	TSConditionalType() {},
	TSInferType() {},
	TSTypeQuery() {},
	TSTypePredicate() {},
	TSImportType() {},
	TSLiteralType() {},
	TSTemplateLiteralType() {},
	TSThisType() {},
	TSRestType() {},
	TSOptionalType() {},
	TSAnyKeyword() {},
	TSBigIntKeyword() {},
	TSBooleanKeyword() {},
	TSNeverKeyword() {},
	TSNullKeyword() {},
	TSNumberKeyword() {},
	TSObjectKeyword() {},
	TSStringKeyword() {},
	TSSymbolKeyword() {},
	TSUndefinedKeyword() {},
	TSUnknownKeyword() {},
	TSVoidKeyword() {},
	TSIntrinsicKeyword() {},

	// === Type-only Declarations (skip entirely) ===
	TSInterfaceDeclaration() {},
	TSInterfaceBody() {},
	TSTypeAliasDeclaration() {},
	TSEnumDeclaration() {},
	TSDeclareFunction() {},
	TSModuleDeclaration() {},
	TSModuleBlock() {},

	// === Assertions and Casts (output the expression only) ===
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TSAsExpression(node: any, state: any) {
		this[node.expression.type](node.expression, state);
	},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TSTypeAssertion(node: any, state: any) {
		this[node.expression.type](node.expression, state);
	},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TSSatisfiesExpression(node: any, state: any) {
		this[node.expression.type](node.expression, state);
	},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TSNonNullExpression(node: any, state: any) {
		this[node.expression.type](node.expression, state);
	},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TSInstantiationExpression(node: any, state: any) {
		this[node.expression.type](node.expression, state);
	},

	// === Parameter Properties ===
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TSParameterProperty(node: any, state: any) {
		this[node.parameter.type](node.parameter, state);
	},

	// === Other TS-specific nodes ===
	TSExternalModuleReference() {},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TSQualifiedName(node: any, state: any) {
		this[node.left.type](node.left, state);
		state.write(".");
		state.write(node.right.name);
	},
	TSPropertySignature() {},
	TSMethodSignature() {},
	TSCallSignatureDeclaration() {},
	TSConstructSignatureDeclaration() {},
	TSIndexSignature() {},

	// === Override nodes with optional type annotations ===
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Literal(node: any, state: any) {
		if (typeof node.value === "string") {
			state.write(JSON.stringify(node.value));
		} else if (node.raw !== undefined) {
			state.write(node.raw);
		} else if (node.value === null) {
			state.write("null");
		} else {
			state.write(String(node.value));
		}
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Identifier(node: any, state: any) {
		state.write(node.name);
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	FunctionDeclaration(node: any, state: any) {
		if (node.async) state.write("async ");
		state.write("function");
		if (node.generator) state.write("*");
		if (node.id) {
			state.write(" ");
			state.write(node.id.name);
		}
		formatFunction(node, state, this);
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	FunctionExpression(node: any, state: any) {
		if (node.async) state.write("async ");
		state.write("function");
		if (node.generator) state.write("*");
		if (node.id) {
			state.write(" ");
			state.write(node.id.name);
		}
		formatFunction(node, state, this);
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ArrowFunctionExpression(node: any, state: any) {
		if (node.async) state.write("async ");
		const params = node.params;
		if (
			params.length === 1 &&
			params[0].type === "Identifier" &&
			!params[0].typeAnnotation
		) {
			state.write(params[0].name);
		} else {
			state.write("(");
			for (let i = 0; i < params.length; i++) {
				if (i > 0) state.write(", ");
				formatParam(params[i], state, this);
			}
			state.write(")");
		}
		state.write(" => ");
		if (node.body.type === "BlockStatement") {
			this.BlockStatement(node.body, state);
		} else {
			const needsParens = node.body.type === "ObjectExpression";
			if (needsParens) state.write("(");
			this[node.body.type](node.body, state);
			if (needsParens) state.write(")");
		}
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	VariableDeclarator(node: any, state: any) {
		if (node.id.type === "Identifier") {
			state.write(node.id.name);
		} else {
			this[node.id.type](node.id, state);
		}
		if (node.init) {
			state.write(" = ");
			this[node.init.type](node.init, state);
		}
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ClassDeclaration(node: any, state: any) {
		state.write("class");
		if (node.id) {
			state.write(" ");
			state.write(node.id.name);
		}
		if (node.superClass) {
			state.write(" extends ");
			this[node.superClass.type](node.superClass, state);
		}
		state.write(" ");
		this.ClassBody(node.body, state);
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ClassExpression(node: any, state: any) {
		state.write("class");
		if (node.id) {
			state.write(" ");
			state.write(node.id.name);
		}
		if (node.superClass) {
			state.write(" extends ");
			this[node.superClass.type](node.superClass, state);
		}
		state.write(" ");
		this.ClassBody(node.body, state);
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	MethodDefinition(node: any, state: any) {
		if (node.static) state.write("static ");
		if (node.kind === "get") state.write("get ");
		else if (node.kind === "set") state.write("set ");
		if (node.value.async) state.write("async ");
		if (node.value.generator) state.write("*");
		if (node.computed) {
			state.write("[");
			this[node.key.type](node.key, state);
			state.write("]");
		} else {
			this[node.key.type](node.key, state);
		}
		formatFunction(node.value, state, this);
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	PropertyDefinition(node: any, state: any) {
		if (node.static) state.write("static ");
		if (node.computed) {
			state.write("[");
			this[node.key.type](node.key, state);
			state.write("]");
		} else {
			this[node.key.type](node.key, state);
		}
		if (node.value) {
			state.write(" = ");
			this[node.value.type](node.value, state);
		}
		state.write(";");
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ImportDeclaration(node: any, state: any) {
		if (node.importKind === "type") return;
		state.write("import ");
		const specifiers = node.specifiers;
		const defaultSpecifier = specifiers.find(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(s: any) => s.type === "ImportDefaultSpecifier",
		);
		const namespaceSpecifier = specifiers.find(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(s: any) => s.type === "ImportNamespaceSpecifier",
		);
		const namedSpecifiers = specifiers.filter(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(s: any) => s.type === "ImportSpecifier" && s.importKind !== "type",
		);

		if (defaultSpecifier) {
			state.write(defaultSpecifier.local.name);
			if (namespaceSpecifier || namedSpecifiers.length > 0) state.write(", ");
		}
		if (namespaceSpecifier) {
			state.write("* as ");
			state.write(namespaceSpecifier.local.name);
		}
		if (namedSpecifiers.length > 0) {
			state.write("{ ");
			for (let i = 0; i < namedSpecifiers.length; i++) {
				if (i > 0) state.write(", ");
				const spec = namedSpecifiers[i];
				if (spec.imported.name !== spec.local.name) {
					state.write(spec.imported.name);
					state.write(" as ");
				}
				state.write(spec.local.name);
			}
			state.write(" }");
		}
		if (specifiers.length > 0) state.write(" from ");
		state.write(JSON.stringify(node.source.value));
		state.write(";");
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ExportNamedDeclaration(node: any, state: any) {
		if (node.exportKind === "type") return;
		state.write("export ");
		if (node.declaration) {
			this[node.declaration.type](node.declaration, state);
		} else {
			state.write("{ ");
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const specifiers = node.specifiers.filter(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(s: any) => s.exportKind !== "type",
			);
			for (let i = 0; i < specifiers.length; i++) {
				if (i > 0) state.write(", ");
				const spec = specifiers[i];
				state.write(spec.local.name);
				if (spec.exported.name !== spec.local.name) {
					state.write(" as ");
					state.write(spec.exported.name);
				}
			}
			state.write(" }");
			if (node.source) {
				state.write(" from ");
				state.write(JSON.stringify(node.source.value));
			}
			state.write(";");
		}
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ExportDefaultDeclaration(node: any, state: any) {
		state.write("export default ");
		this[node.declaration.type](node.declaration, state);
		if (
			node.declaration.type !== "FunctionDeclaration" &&
			node.declaration.type !== "ClassDeclaration"
		) {
			state.write(";");
		}
	},

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ExportAllDeclaration(node: any, state: any) {
		if (node.exportKind === "type") return;
		state.write("export * ");
		if (node.exported) {
			state.write("as ");
			state.write(node.exported.name);
			state.write(" ");
		}
		state.write("from ");
		state.write(JSON.stringify(node.source.value));
		state.write(";");
	},
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatParam(param: any, state: any, generator: any) {
	switch (param.type) {
		case "Identifier":
			state.write(param.name);
			break;
		case "AssignmentPattern":
			formatParam(param.left, state, generator);
			state.write(" = ");
			generator[param.right.type](param.right, state);
			break;
		case "RestElement":
			state.write("...");
			formatParam(param.argument, state, generator);
			break;
		case "ObjectPattern":
		case "ArrayPattern":
			generator[param.type](param, state);
			break;
		case "TSParameterProperty":
			formatParam(param.parameter, state, generator);
			break;
		default:
			generator[param.type](param, state);
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatFunction(node: any, state: any, generator: any) {
	state.write("(");
	const params = node.params;
	for (let i = 0; i < params.length; i++) {
		if (i > 0) state.write(", ");
		formatParam(params[i], state, generator);
	}
	state.write(") ");
	generator.BlockStatement(node.body, state);
}

/**
 * Parse JSX pragma comments to determine runtime mode.
 */
function parseJSXPragma(code: string): {
	jsxRuntime: "automatic" | "classic";
	jsxImportSource?: string;
	jsxPragma?: string;
	jsxFragmentPragma?: string;
} {
	const importSourceMatch = code.match(/@jsxImportSource\s+(\S+)/);
	if (importSourceMatch) {
		return {
			jsxRuntime: "automatic",
			jsxImportSource: importSourceMatch[1],
		};
	}

	const jsxMatch = code.match(/@jsx\s+(\S+)/);
	const jsxFragMatch = code.match(/@jsxFrag\s+(\S+)/);
	if (jsxMatch) {
		return {
			jsxRuntime: "classic",
			jsxPragma: jsxMatch[1],
			jsxFragmentPragma: jsxFragMatch?.[1] || "Fragment",
		};
	}

	return {
		jsxRuntime: "automatic",
		jsxImportSource: "@b9g/crank",
	};
}

/**
 * Walk the AST and inject loop guards into for, while, and do-while loops.
 * Uses iteration count (not time) to detect infinite loops.
 * Skips for-in and for-of loops since they iterate over finite collections
 * or generator yields (like Crank's `for (... of this)` pattern).
 */
const MAX_ITERATIONS = Math.pow(2, 20); // ~1 million iterations

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function injectLoopGuards(ast: any): void {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function walk(node: any) {
		if (!node || typeof node !== "object") return;

		// Only guard while, do-while, and for loops (not for-in/for-of)
		if (
			node.type === "ForStatement" ||
			node.type === "WhileStatement" ||
			node.type === "DoWhileStatement"
		) {
			const id = loopId++;
			// if (++__loopCounter_N > MAX_ITERATIONS) throw new RangeError("...");
			const guardCheck: ESTree.IfStatement = {
				type: "IfStatement",
				test: {
					type: "BinaryExpression",
					operator: ">",
					left: {
						type: "UpdateExpression",
						operator: "++",
						prefix: true,
						argument: {type: "Identifier", name: `__loopCounter_${id}`},
					},
					right: {type: "Literal", value: MAX_ITERATIONS},
				},
				consequent: {
					type: "ThrowStatement",
					argument: {
						type: "NewExpression",
						callee: {type: "Identifier", name: "RangeError"},
						arguments: [
							{
								type: "Literal",
								value: "Potential infinite loop detected",
							},
						],
					},
				} as ESTree.ThrowStatement,
				alternate: null,
			};

			if (node.body.type !== "BlockStatement") {
				node.body = {
					type: "BlockStatement",
					body: [node.body],
				};
			}

			node.body.body.unshift(guardCheck);
			node.__loopGuardId = id;
		}

		for (const key in node) {
			if (key === "type" || key === "loc" || key === "start" || key === "end")
				continue;
			const child = node[key];
			if (Array.isArray(child)) {
				child.forEach((c) => walk(c));
			} else if (child && typeof child === "object") {
				walk(child);
			}
		}
	}

	walk(ast);

	// Second pass: insert loop counter declarations
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function wrapLoops(node: any) {
		if (!node || typeof node !== "object") return;

		if (node.__loopGuardId !== undefined) {
			const id = node.__loopGuardId;
			delete node.__loopGuardId;

			// let __loopCounter_N = 0;
			const initDecl: ESTree.VariableDeclaration = {
				type: "VariableDeclaration",
				declarations: [
					{
						type: "VariableDeclarator",
						id: {type: "Identifier", name: `__loopCounter_${id}`},
						init: {type: "Literal", value: 0},
					},
				],
				kind: "let",
			};

			node.__loopInitDecl = initDecl;
		}

		for (const key in node) {
			if (key === "type" || key === "loc" || key === "start" || key === "end")
				continue;
			const child = node[key];
			if (Array.isArray(child)) {
				for (let i = child.length - 1; i >= 0; i--) {
					wrapLoops(child[i]);
					if (child[i]?.__loopInitDecl) {
						const initDecl = child[i].__loopInitDecl;
						delete child[i].__loopInitDecl;
						child.splice(i, 0, initDecl);
					}
				}
			} else if (child && typeof child === "object") {
				wrapLoops(child);
			}
		}
	}

	wrapLoops(ast);
}

/**
 * Transform JSX elements to function calls.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformJSX(
	ast: any,
	pragma: ReturnType<typeof parseJSXPragma>,
): void {
	function walk(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		node: any,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		parent: any = null,
		parentKey: string | null = null,
		parentIndex: number | null = null,
	) {
		if (!node || typeof node !== "object") return;

		if (node.type === "JSXElement") {
			const transformed = transformJSXElement(node, pragma);
			if (parent && parentKey !== null) {
				if (parentIndex !== null) {
					parent[parentKey][parentIndex] = transformed;
				} else {
					parent[parentKey] = transformed;
				}
			}
			walk(transformed, parent, parentKey, parentIndex);
			return;
		}

		if (node.type === "JSXFragment") {
			const transformed = transformJSXFragment(node, pragma);
			if (parent && parentKey !== null) {
				if (parentIndex !== null) {
					parent[parentKey][parentIndex] = transformed;
				} else {
					parent[parentKey] = transformed;
				}
			}
			walk(transformed, parent, parentKey, parentIndex);
			return;
		}

		for (const key in node) {
			if (key === "type" || key === "loc" || key === "start" || key === "end")
				continue;
			const child = node[key];
			if (Array.isArray(child)) {
				for (let i = 0; i < child.length; i++) {
					walk(child[i], node, key, i);
				}
			} else if (child && typeof child === "object") {
				walk(child, node, key, null);
			}
		}
	}

	walk(ast);
}

function transformJSXElement(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	node: any,
	pragma: ReturnType<typeof parseJSXPragma>,
): ESTree.CallExpression {
	const openingElement = node.openingElement;
	const tagName = openingElement.name;

	let tag: ESTree.Expression;
	if (tagName.type === "JSXIdentifier") {
		const name = tagName.name;
		if (
			name[0] === name[0].toLowerCase() &&
			name[0] !== name[0].toUpperCase()
		) {
			tag = {type: "Literal", value: name};
		} else {
			tag = {type: "Identifier", name};
		}
	} else if (tagName.type === "JSXMemberExpression") {
		tag = transformJSXMemberExpression(tagName);
	} else {
		tag = {type: "Identifier", name: tagName.name};
	}

	const {props, propsWithKey, keyExpr} = transformJSXAttributes(
		openingElement.attributes,
	);
	const children = transformJSXChildren(node.children, pragma);

	if (pragma.jsxRuntime === "automatic") {
		const jsxFunc = children.length > 1 ? "jsxs" : "jsx";
		const propsWithChildren: ESTree.ObjectExpression = {
			type: "ObjectExpression",
			properties: [
				...props.properties,
				...(children.length > 0
					? [
							{
								type: "Property",
								key: {type: "Identifier", name: "children"},
								value:
									children.length === 1
										? children[0]
										: {type: "ArrayExpression", elements: children},
								kind: "init",
								method: false,
								shorthand: false,
								computed: false,
							} as ESTree.Property,
						]
					: []),
			],
		};

		// Automatic JSX runtime expects key as the third argument
		const args: ESTree.Expression[] = [tag, propsWithChildren];
		if (keyExpr) {
			args.push(keyExpr);
		}

		return {
			type: "CallExpression",
			callee: {
				type: "MemberExpression",
				object: {type: "Identifier", name: "_jsxRuntime"},
				property: {type: "Identifier", name: jsxFunc},
				computed: false,
				optional: false,
			},
			arguments: args,
			optional: false,
		};
	} else {
		const callee: ESTree.Expression = pragma.jsxPragma!.includes(".")
			? createMemberExpression(pragma.jsxPragma!)
			: {type: "Identifier", name: pragma.jsxPragma!};

		// Classic runtime: key stays in props at its original position
		return {
			type: "CallExpression",
			callee,
			arguments: [
				tag,
				propsWithKey.properties.length > 0
					? propsWithKey
					: {type: "Literal", value: null},
				...children,
			],
			optional: false,
		};
	}
}

function transformJSXFragment(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	node: any,
	pragma: ReturnType<typeof parseJSXPragma>,
): ESTree.CallExpression {
	const children = transformJSXChildren(node.children, pragma);

	if (pragma.jsxRuntime === "automatic") {
		const jsxFunc = children.length > 1 ? "jsxs" : "jsx";
		const propsWithChildren: ESTree.ObjectExpression = {
			type: "ObjectExpression",
			properties:
				children.length > 0
					? [
							{
								type: "Property",
								key: {type: "Identifier", name: "children"},
								value:
									children.length === 1
										? children[0]
										: {type: "ArrayExpression", elements: children},
								kind: "init",
								method: false,
								shorthand: false,
								computed: false,
							} as ESTree.Property,
						]
					: [],
		};

		return {
			type: "CallExpression",
			callee: {
				type: "MemberExpression",
				object: {type: "Identifier", name: "_jsxRuntime"},
				property: {type: "Identifier", name: jsxFunc},
				computed: false,
				optional: false,
			},
			arguments: [
				{
					type: "MemberExpression",
					object: {type: "Identifier", name: "_jsxRuntime"},
					property: {type: "Identifier", name: "Fragment"},
					computed: false,
					optional: false,
				},
				propsWithChildren,
			],
			optional: false,
		};
	} else {
		const callee: ESTree.Expression = pragma.jsxPragma!.includes(".")
			? createMemberExpression(pragma.jsxPragma!)
			: {type: "Identifier", name: pragma.jsxPragma!};

		const fragmentId: ESTree.Expression = pragma.jsxFragmentPragma!.includes(
			".",
		)
			? createMemberExpression(pragma.jsxFragmentPragma!)
			: {type: "Identifier", name: pragma.jsxFragmentPragma!};

		return {
			type: "CallExpression",
			callee,
			arguments: [fragmentId, {type: "Literal", value: null}, ...children],
			optional: false,
		};
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformJSXMemberExpression(node: any): ESTree.MemberExpression {
	let object: ESTree.Expression;
	if (node.object.type === "JSXMemberExpression") {
		object = transformJSXMemberExpression(node.object);
	} else {
		object = {type: "Identifier", name: node.object.name};
	}

	return {
		type: "MemberExpression",
		object,
		property: {type: "Identifier", name: node.property.name},
		computed: false,
		optional: false,
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformJSXAttributes(attributes: any[]): {
	props: ESTree.ObjectExpression;
	propsWithKey: ESTree.ObjectExpression;
	keyExpr: ESTree.Expression | null;
} {
	const properties: ESTree.Property[] = [];
	const propertiesWithKey: ESTree.Property[] = [];
	let keyExpr: ESTree.Expression | null = null;

	for (const attr of attributes) {
		if (attr.type === "JSXSpreadAttribute") {
			const spreadElement = {
				type: "SpreadElement",
				argument: attr.argument,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any;
			properties.push(spreadElement);
			propertiesWithKey.push(spreadElement);
		} else if (attr.type === "JSXAttribute") {
			const name =
				attr.name.type === "JSXIdentifier" ? attr.name.name : attr.name.name;
			let value: ESTree.Expression;

			if (attr.value === null) {
				value = {type: "Literal", value: true};
			} else if (attr.value.type === "Literal") {
				value = attr.value;
			} else if (attr.value.type === "JSXExpressionContainer") {
				value = attr.value.expression;
			} else {
				value = attr.value;
			}

			const property: ESTree.Property = {
				type: "Property",
				key: {type: "Identifier", name},
				value,
				kind: "init",
				method: false,
				shorthand: false,
				computed: false,
			};

			// Extract the key prop for automatic JSX runtime (passed as 3rd arg)
			// but keep it in propsWithKey for classic runtime
			if (name === "key") {
				keyExpr = value;
				propertiesWithKey.push(property);
			} else {
				properties.push(property);
				propertiesWithKey.push(property);
			}
		}
	}

	return {
		props: {
			type: "ObjectExpression",
			properties,
		},
		propsWithKey: {
			type: "ObjectExpression",
			properties: propertiesWithKey,
		},
		keyExpr,
	};
}

function transformJSXChildren(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	children: any[],
	pragma: ReturnType<typeof parseJSXPragma>,
): ESTree.Expression[] {
	const result: ESTree.Expression[] = [];

	for (const child of children) {
		if (child.type === "JSXText") {
			const text = child.value.replace(/^\s+|\s+$/g, " ").replace(/\n\s*/g, "");
			if (text.trim()) {
				result.push({type: "Literal", value: text});
			}
		} else if (child.type === "JSXExpressionContainer") {
			if (child.expression.type !== "JSXEmptyExpression") {
				result.push(child.expression);
			}
		} else if (child.type === "JSXElement") {
			result.push(transformJSXElement(child, pragma));
		} else if (child.type === "JSXFragment") {
			result.push(transformJSXFragment(child, pragma));
		} else if (child.type === "JSXSpreadChild") {
			result.push({
				type: "SpreadElement",
				argument: child.expression,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any);
		}
	}

	return result;
}

function createMemberExpression(path: string): ESTree.MemberExpression {
	const parts = path.split(".");
	let expr: ESTree.Expression = {type: "Identifier", name: parts[0]};
	for (let i = 1; i < parts.length; i++) {
		expr = {
			type: "MemberExpression",
			object: expr,
			property: {type: "Identifier", name: parts[i]},
			computed: false,
			optional: false,
		};
	}
	return expr as ESTree.MemberExpression;
}

/**
 * Add JSX runtime import for automatic mode.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addJSXRuntimeImport(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ast: any,
	pragma: ReturnType<typeof parseJSXPragma>,
): void {
	if (pragma.jsxRuntime !== "automatic") return;

	const importDecl = {
		type: "ImportDeclaration",
		specifiers: [
			{
				type: "ImportNamespaceSpecifier",
				local: {type: "Identifier", name: "_jsxRuntime"},
			},
		],
		source: {type: "Literal", value: `${pragma.jsxImportSource}/jsx-runtime`},
	};

	ast.body.unshift(importDecl);
}

/**
 * Format a syntax error with code context and pointer.
 */
function formatSyntaxError(code: string, error: any): string {
	const lines = code.split("\n");
	const line = error.loc?.line ?? 1;
	const column = error.loc?.column ?? 0;

	// Get surrounding lines for context
	const start = Math.max(0, line - 3);
	const end = Math.min(lines.length, line + 2);

	let result = `SyntaxError: ${error.message}\n\n`;

	for (let i = start; i < end; i++) {
		const lineNum = i + 1;
		const prefix = lineNum === line ? "> " : "  ";
		const gutter = String(lineNum).padStart(4, " ");
		result += `${prefix}${gutter} | ${lines[i]}\n`;

		if (lineNum === line) {
			// Add pointer to the error position
			const pointer = " ".repeat(column) + "^";
			result += `       | ${pointer}\n`;
		}
	}

	return result;
}

/**
 * Transform TypeScript/TSX code to JavaScript with loop protection.
 */
export function transform(code: string): {code: string} {
	const pragma = parseJSXPragma(code);

	let ast;
	try {
		ast = TypeScriptParser.parse(code, {
			sourceType: "module",
			ecmaVersion: "latest",
			locations: true,
		});
	} catch (error: any) {
		if (error.loc) {
			throw new SyntaxError(formatSyntaxError(code, error));
		}
		throw error;
	}

	transformJSX(ast, pragma);
	addJSXRuntimeImport(ast, pragma);
	injectLoopGuards(ast);

	const output = generate(ast, {generator: tsGenerator});

	return {code: output};
}
