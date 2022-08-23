import * as Babel from "@babel/core";
// @ts-ignore
import babelPluginSyntaxJSX from "@babel/plugin-syntax-jsx";
// @ts-ignore
import babelPluginTransformReactJSX from "@babel/plugin-transform-react-jsx";

// @ts-ignore
import babelPresetTypeScript from "@babel/preset-typescript";

function rewriteBareModuleSpecifiers(): Babel.PluginObj {
	function rewrite(value: string) {
		return new URL(value, "https://esm.sh/").toString();
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

const script = document.createElement("script");
script.type = "module";
script.crossOrigin = "";

window.addEventListener("message", (ev) => {
	const code = ev.data;
	let parsed: any = null;
	try {
		parsed = Babel.transform(code, {
			filename: "file",
			presets: [
				[
					babelPresetTypeScript,
					{
						isTSX: true,
						allExtensions: true,
						jsxPragma: "createElement",
						jsxPragmaFrag: "''",
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
					},
				],
				rewriteBareModuleSpecifiers,
			],
		});
	} catch (err) {
		if (err instanceof SyntaxError) {
			const message = err.message.replace(/^\/file: /, "");
			window.parent.postMessage(
				JSON.stringify({type: "syntaxError", message}),
				window.location.origin,
			);
		}
	}

	if (parsed) {
		script.remove();
		script.text =
			(parsed.code || "") +
			`;window.parent.postMessage(
				JSON.stringify({type: "executed"}),
				window.location.origin,
			);`;
		document.head.appendChild(script);
	}
});

window.addEventListener("error", (ev) => {
	// TODO: handle CORS-truncated errors
	window.parent.postMessage(
		JSON.stringify({type: "error", message: ev.message}),
		window.location.origin,
	);
});

window.parent.postMessage(
	JSON.stringify({type: "ready"}),
	window.location.origin,
);
