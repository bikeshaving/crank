/** @jsx createElement */
import path from "path";
import webpack from "webpack";
import {Children, Context, createElement, Fragment} from "@bikeshaving/crank";
import {Repeater} from "@repeaterjs/repeater";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
// @ts-ignore
import postcssPresetEnv from "postcss-preset-env";
// @ts-ignore
import postcssNested from "postcss-nested";
/* eslint-disable no-console */

const config: webpack.Configuration = {
	mode: "development",
	// WHY TYPESCRIPT
	plugins: [new MiniCssExtractPlugin({filename: "[name].css"}) as any],
	module: {
		rules: [
			{
				test: /(\.jsx?|\.tsx?)$/i,
				use: "ts-loader",
				exclude: /node_modules/,
			},
			{
				test: /\.css/i,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: "css-loader",
						options: {
							importLoaders: 1,
						},
					},
					{
						loader: "postcss-loader",
						options: {
							plugins: [postcssPresetEnv(), postcssNested()],
						},
					},
				],
			},
			{
				test: /\.svg/i,
				use: {
					loader: "url-loader",
					options: {
						name: "[path][name].[ext]",
					},
				},
			},
			{
				test: /\.md/i,
				use: ["html-loader", "md-loader"],
			},
		],
	},
	resolve: {
		extensions: [".js", ".jsx", ".ts", ".tsx"],
	},
	output: {
		filename: "[name].js",
		path: path.resolve(__dirname, "dist"),
	},
};

function isWithinDir(dir: string, name: string) {
	const resolved = path.resolve(dir, name);
	return resolved.startsWith(dir);
}

export class Storage {
	private compiler: webpack.Compiler;
	private dir: string;
	private files: Record<string, string> = {};
	private iterator?: AsyncGenerator<webpack.Stats.ToJsonOutput>;
	private runResult?: Promise<webpack.Stats.ToJsonOutput>;
	constructor(dir: string) {
		if (!path.isAbsolute(dir)) {
			throw new Error(`path ${dir} is not absolute`);
		}

		this.dir = path.normalize(dir);
		this.compiler = webpack({
			...config,
			context: this.dir,
			entry: () => this.files,
		});
	}

	private run(): Promise<webpack.Stats.ToJsonOutput> {
		if (this.runResult === undefined) {
			this.runResult = new Promise<webpack.Stats.ToJsonOutput>(
				(resolve, reject) => {
					setTimeout(() => {
						this.compiler.run((err, stats) => {
							if (err) {
								reject(err);
							} else {
								const info = stats.toJson();
								if (stats.hasErrors()) {
									console.error(info.errors);
									reject(info.errors.toString());
								} else if (stats.hasWarnings()) {
									console.error(info.warnings);
								}

								resolve(info);
							}
						});
					});
				},
			).finally(() => {
				this.runResult = undefined;
			});
		}

		return this.runResult;
	}

	private run1(): Promise<webpack.Stats.ToJsonOutput> {
		if (this.runResult === undefined) {
			if (this.iterator === undefined) {
				this.iterator = this.watch();
			}

			this.runResult = new Promise((resolve) => setTimeout(resolve, 100))
				.then(() => this.iterator!.next())
				.then((iteration) => iteration.value)
				.finally(() => (this.runResult = undefined));
		}

		return this.runResult;
	}

	private watch(): AsyncGenerator<webpack.Stats.ToJsonOutput> {
		return new Repeater(async (push, stop) => {
			let stopped = false;
			stop.then(() => (stopped = true));
			let resolve: (stats: webpack.Stats.ToJsonOutput) => unknown;
			let stats = new Promise<webpack.Stats.ToJsonOutput>(
				(resolve1) => (resolve = resolve1),
			);
			const watching = this.compiler.watch({}, (err, stats) => {
				if (err) {
					stop(err);
				} else {
					const info = stats.toJson();
					if (stats.hasErrors()) {
						console.error(info.errors.toString());
						stop(info.errors.toString());
						return;
					} else if (stats.hasWarnings()) {
						console.error(info.warnings.toString());
					}

					console.log("compiled ", new Date());
					resolve(stats.toJson());
				}
			});

			while (!stopped) {
				await push(stats);
				stats = new Promise<webpack.Stats.ToJsonOutput>(
					(resolve1) => (resolve = resolve1),
				);
				watching.invalidate();
			}

			return new Promise((resolve) => watching.close(resolve));
		});
	}

	async url(name: string, ext: string = ".js"): Promise<string | undefined> {
		if (!isWithinDir(this.dir, name)) {
			throw new Error(
				"Attempting to access a file outside the provided directory",
			);
		}

		name = path
			.resolve(this.dir, name)
			.replace(new RegExp("^" + this.dir + "/"), "");
		this.files = {...this.files, [name]: "./" + name};
		const stats = await this.run1();
		let assets = stats.assetsByChunkName![name];
		if (!Array.isArray(assets)) {
			assets = [assets];
		}

		return "/" + assets.find((asset) => asset && asset.endsWith(ext));
	}
}

const StorageKey = Symbol.for("CrankWebpackStorageKey");

export interface PageProps {
	storage: Storage;
	children: Children;
}

export function* Page(this: Context, {storage, children}: PageProps) {
	this.set(StorageKey, storage);
	for (const {storage: nextStorage} of this) {
		if (storage !== nextStorage) {
			this.set(StorageKey, nextStorage);
			storage = nextStorage;
		}

		yield <Fragment>{children}</Fragment>;
	}
}

export async function Link(this: Context, props: Record<string, any>) {
	const storage: Storage = this.get(StorageKey);
	if (storage == null) {
		throw new Error("Storage not found");
	}

	const url = await storage.url(props.href, ".css");
	return <link rel="stylesheet" href={url} />;
}

//TODO: type script correctly
export async function Script(this: Context, props: Record<string, any>) {
	const storage: Storage = this.get(StorageKey);
	if (storage == null) {
		throw new Error("Storage not found");
	}

	const url = await storage.url(props.src, ".js");
	return <script src={url} />;
}
