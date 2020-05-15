import resolve from "@rollup/plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";
function generateBundle(_, bundle) {
	for (var f in bundle)
		if (bundle[f].fileName.endsWith(".d.ts"))
			bundle[f].source = bundle[f].source
				.replace(/.*event-target-shim.*\s*/, "")
				.replace(/Shim implements EventTarget/, "");
}
export default [
	{
		input: ["src/index.ts", "src/dom.ts", "src/html.ts"],
		output: [{format: "cjs", dir: "cjs", sourcemap: true}],
		plugins: [typescript(), resolve(), {generateBundle}],
	},
	{
		input: ["src/index.ts", "src/dom.ts", "src/html.ts"],
		output: [{format: "esm", dir: "esm", sourcemap: true}],
		plugins: [
			typescript({tsconfigOverride: {compilerOptions: {target: "esnext"}}}),
			process.env.EVTSHIM !== "0" && resolve(),
			process.env.EVTSHIM === "0" && {
				transform(code) {
					return {
						code: code.replace(
							/.*event-target-shim.*/,
							'var EventTargetShim=typeof EventTarget=="function"?EventTarget:/*ssr dummy*/Object',
						),
						map: null,
					};
				},
			},
			{generateBundle},
		],
	},
];
