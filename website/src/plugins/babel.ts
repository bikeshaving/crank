import * as Babel from "@babel/core";
// @ts-expect-error
import babelPluginSyntaxJSX from "@babel/plugin-syntax-jsx";
// @ts-expect-error
import babelPluginTransformReactJSX from "@babel/plugin-transform-react-jsx";
// @ts-expect-error
import babelPresetTypeScript from "@babel/preset-typescript";

import {extractData} from "../components/serialize-javascript.js";

function rewriteBareModuleSpecifiers(): Babel.PluginObj {
	function rewrite(value: string): string {
		if (typeof window !== "undefined") {
			const staticURLsScript = document.getElementById(
				"static-urls",
			) as HTMLScriptElement;
			if (staticURLsScript) {
				const staticURLs = extractData(staticURLsScript) as Record<string, any>;
				if (staticURLs[value]) {
					return staticURLs[value];
				}
			}
		}

		return new URL(value, "https://unpkg.com/").toString() + "?module";
	}

	return {
		name: "rewrite-bare-module-specifiers",
		visitor: {
			ImportDeclaration(path) {
				path.node.source.value = rewrite(path.node.source.value);
			},
			ExportDeclaration(path) {
				if ("source" in path.node && path.node.source) {
					path.node.source.value = rewrite(path.node.source.value);
				}
			},
			CallExpression(path) {
				if (path.node.callee.type === "Import") {
					const maybeImportStringLiteral = path.node.arguments[0];
					if (maybeImportStringLiteral.type === "StringLiteral") {
						maybeImportStringLiteral.value = rewrite(
							maybeImportStringLiteral.value,
						);
					}
				}
			},
		},
	};
}

// TODO: This type might not be right.
function guardLoops({template, types}: typeof Babel): Babel.PluginObj {
	// Adapted from https://stackoverflow.com/a/73393992/1825413
	const MAX_ITERATIONS = Math.pow(2, 20);
	const buildGuard = template(`
    if (COUNTER++ > MAX_ITERATIONS) {
      throw new RangeError("Possible infinite loop detected");
    }
  `);

	function protect(path: Babel.NodePath) {
		const counter = path.scope.parent.generateUidIdentifier("loopCounter");
		path.scope.parent.push({
			id: counter,
			init: types.numericLiteral(0),
		});

		const guard = buildGuard({
			COUNTER: counter,
			MAX_ITERATIONS: types.numericLiteral(MAX_ITERATIONS),
		});

		// No block statment e.g. `while (1) 1;`
		// @ts-ignore maybe isBlockStatement() is deprecated or something
		if (!path.get("body").isBlockStatement()) {
			// @ts-ignore
			const statement = path.get("body").node;
			// @ts-ignore
			path.get("body").replaceWith(types.blockStatement([guard, statement]));
		} else {
			// @ts-ignore
			path.get("body").unshiftContainer("body", guard);
		}
	}

	return {
		name: "guard-loops",
		visitor: {
			WhileStatement(path) {
				protect(path);
			},
			DoWhileStatement(path) {
				protect(path);
			},
			ForStatement(path) {
				protect(path);
			},
		},
	};
}

export function transform(code: string) {
	try {
		return Babel.transform(code, {
			filename: "file",
			presets: [
				[
					babelPresetTypeScript,
					{
						isTSX: true,
						allExtensions: true,
						jsxPragma: "createElement",
						jsxPragmaFrag: "''",
						allowDeclareFields: true,
					},
				],
			],
			plugins: [
				babelPluginSyntaxJSX,
				[
					babelPluginTransformReactJSX,
					{
						runtime: "automatic",
						importSource: "@b9g/crank",
						throwIfNamespace: false,
					},
				],
				rewriteBareModuleSpecifiers,
				guardLoops,
				//messageScriptStatus,
			],

			sourceMaps: "inline",
		});
	} catch (err: any) {
		// TODO: There might be a better way to do this.
		if (
			/pragma and pragmaFrag cannot be set when runtime is automatic/.test(
				err.message,
			)
		) {
			return Babel.transform(code, {
				filename: "file",
				presets: [
					[
						babelPresetTypeScript,
						{
							isTSX: true,
							allExtensions: true,
							jsxPragma: "createElement",
							jsxPragmaFrag: "''",
							allowDeclareFields: true,
						},
					],
				],
				plugins: [
					babelPluginSyntaxJSX,
					[
						babelPluginTransformReactJSX,
						{
							runtime: "classic",
							pragma: "createElement",
							pragmaFrag: "''",
							throwIfNamespace: false,
						},
					],
					rewriteBareModuleSpecifiers,
					guardLoops,
					//messageScriptStatus,
				],

				sourceMaps: "inline",
			});
		}

		throw err;
	}
}
