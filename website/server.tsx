/* @jsx createElement */
import fs from "fs";
import path from "path";
import webpack from "webpack";
import {createElement, Fragment} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/cjs/html";

const config: webpack.Configuration = {
	mode: "development",
	module: {
		rules: [
			{
				test: /(\.jsx|\.tsx?)$/i,
				use: "ts-loader",
				exclude: /node_modules/,
			},
			{
				test: /\.css/i,
				use: ["style-loader", "css-loader"],
			},
		],
	},
	resolve: {
		extensions: [".js", ".jsx", ".ts", ".tsx"],
	},
	output: {
		filename: "[contenthash].js",
		path: path.resolve(__dirname, "dist"),
	},
};

let compiler: webpack.Compiler | undefined;
function addEntry(entry: string): webpack.Compiler {
	if (compiler === undefined) {
		compiler = webpack({entry: {[entry]: entry}, ...config});
	} else if (!(entry in (compiler.options.entry as any))) {
		(compiler.options.entry as any)[entry] = entry;
	}

	return compiler;
}

async function Script(props: Record<string, any>) {
	const compiler = addEntry(props.src);
	const stats: webpack.Stats.ToJsonOutput = await new Promise(
		(resolve, reject) => {
			compiler.run((err, stats) => {
				if (err) {
					reject(err);
				} else {
					resolve(stats.toJson());
				}
			});
		},
	);

	return <script {...props} />;
}

function Home() {
	return (
		<Fragment>
			{"<!DOCTYPE html>"}
			<html lang="en">
				<head>
					<meta charset="utf-8" />
					<meta
						name="viewport"
						content="width=device-width, initial-scale=1.0"
					/>
					<title>Crank.js</title>
				</head>
				<body>
					<div id="app" />
					<Script src={path.resolve(__dirname, "./index.js")} />
				</body>
			</html>
		</Fragment>
	);
}

(async () => {
	const html = await renderer.renderToString(<Page />);
})();
