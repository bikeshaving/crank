/* @jsx createElement */
import webpack from "webpack";
import {createElement, Fragment} from "@bikeshaving/crank/cjs";
import {renderer} from "@bikeshaving/crank/cjs/html";

let compiler: webpack.Compiler | undefined;
function createCompiler(entry: string): webpack.Compiler {
	if (compiler === undefined) {
		compiler = webpack({
			entry: {[entry]: entry},
			mode: "production",
			module: {
				rules: [
				],
			},
		});
	} else if (!(entry in (compiler.options.entry as any))) {
		(compiler.options.entry as any)[entry] = entry;
	}

	return compiler;
}

async function Script(props: Record<string, any>) {
	const compiler = createCompiler(props.src);
	console.log(compiler.options.module);
	const stats: webpack.Stats.ToJsonOutput = await new Promise((resolve, reject) => {
		compiler.run((err, stats) => {
			if (err) {
				reject(err);
			} else {
				resolve(stats.toJson());
			}
		});
	});

	for (const error of stats.errors) {
		console.log(error);
	}

	for (const warning of stats.warnings) {
		console.log(warning);
	}

	console.log(Object.keys(stats));
	return <script {...props} />;
}

import path from "path";
(async () => {
	const html = await renderer.renderToString(
		<Fragment>
			{"<!DOCTYPE html>"}
			<html lang="en">
				<head>
					<meta charset="utf-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1.0" />
					<title>Crank.js</title>
				</head>
				<body>
					<div id="app" />
					<Script src={path.resolve(__dirname, "./index.jsx")} />
				</body>
			</html>
		</Fragment>,
	);

	console.log(html);
})();
