import Babel from "@babel/standalone";
import type {PluginObj} from "@babel/core";
// @ts-ignore
//import babelPresetReact from "@babel/preset-react";
// @ts-ignore
//import babelPresetTypeScript from "@babel/preset-typescript";

function rewriteModuleSpecifiers(): PluginObj {
	function rewriteStringLiteral(value: string) {
		switch (value) {
			case "@b9g/crank":
				return "https://esm.sh/@b9g/crank";
			case "@b9g/crank/dom":
				return "https://esm.sh/@b9g/crank/dom";
			case "@b9g/crank/html":
				return "https://esm.sh/@b9g/crank/html";
		}

		return value;
	}

	return {
		name: "rewrite-module-specifiers",
		visitor: {
			ImportDeclaration(path) {
				path.node.source.value = rewriteStringLiteral(path.node.source.value);
			},
			ExportDeclaration(path) {
				if ("source" in path.node && path.node.source) {
					path.node.source.value = rewriteStringLiteral(path.node.source.value);
				}
			},
			CallExpression(path) {
				if (path.node.callee.type === "Import") {
					const maybeImportStringLiteral = path.node.arguments[0];
					if (maybeImportStringLiteral.type === "StringLiteral") {
						maybeImportStringLiteral.value = rewriteStringLiteral(
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

window.addEventListener("message", (ev) => {
	//console.log("global message listener", ev);

	const code = ev.data;
	const parsed = Babel.transform(code, {
		presets: [
			[
				Babel.availablePresets.react,
				{
					runtime: "classic",
					pragma: "createElement",
					pragmaFrag: "''",
				},
			],
			//[babelPresetReact, {
			//	runtime: "classic",
			//	pragma: "createElement",
			//	pragmaFrag: "''",
			//}],
			[
				Babel.availablePresets.typescript,
				{
					isTSX: true,
					allExtensions: true,
					jsxPragma: "createElement",
					jsxPragmaFrag: "''",
				},
			],
			//[babelPresetTypeScript, {
			//	isTSX: true,
			//	allExtensions: true,
			//	jsxPragma: "createElement",
			//	jsxPragmaFrag: "''",
			//}],
		],
		plugins: [rewriteModuleSpecifiers],
	});

	script.remove();
	script.text = (parsed && parsed.code) || "";
	document.body.appendChild(script);
});

window.addEventListener("error", (_ev) => {
	//console.log("global error listener", ev);
});
