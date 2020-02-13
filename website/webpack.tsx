/** @jsx createElement */
import path from "path";
import webpack from "webpack";
import {createElement} from "@bikeshaving/crank";

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

function runCompiler(): Promise<webpack.Stats.ToJsonOutput> {
	return new Promise((resolve, reject) => {
		compiler.run((err, stats) => {
			if (err) {
				reject(err);
			} else {
				resolve(stats.toJson());
			}
		});
	});
}

export async function Script(props: Record<string, any>) {
	addEntry(props.src);
	const stats = await runCompiler();
	const src = stats.assetsByChunkName[props.src].find((asset) =>
		/\.js/.test(asset),
	);
	return <script {...props} src={src} />;
}
