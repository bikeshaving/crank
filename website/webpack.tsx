/** @jsx createElement */
import path from "path";
import webpack from "webpack";
import {Children, Context, createElement, Fragment} from "@bikeshaving/crank";

const config: webpack.Configuration = {
	mode: "development",
	module: {
		rules: [
			{
				test: /(\.jsx?|\.tsx?)$/i,
				use: "ts-loader",
				exclude: /node_modules/,
			},
			{
				test: /\.css/i,
				use: ["style-loader", "css-loader"],
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
		if (this.compiler === undefined) {
			throw new Error("this.compiler is not defined");
		} else if (this.runResult === undefined) {
			this.runResult = new Promise<webpack.Stats.ToJsonOutput>(
				(resolve, reject) => {
					setTimeout(() => {
						this.compiler.run((err, stats) => {
							if (err) {
								reject(err);
							} else {
								const info = stats.toJson();
								if (stats.hasErrors()) {
									reject(info.errors.toString());
								} else if (stats.hasWarnings()) {
									console.error(info.warnings);
								}

								resolve(info);
							}
						});
					}, 50);
				},
			).finally(() => {
				this.runResult = undefined;
			});
		}

		return this.runResult;
	}

	async url(name: string): Promise<string | undefined> {
		if (!isWithinDir(this.dir, name)) {
			throw new Error(
				"Attempting to access a file outside the provided directory",
			);
		}

		name = path
			.resolve(this.dir, name)
			.replace(new RegExp("^" + this.dir + "/"), "");
		this.files[name] = "./" + name;
		const stats = await this.run();
		let assets = stats.assetsByChunkName![name];
		if (!Array.isArray(assets)) {
			assets = [assets];
		}

		return assets.find((asset) => /\.js/.test(asset));
	}
}

const StorageKey = Symbol("webpack.StorageKey");

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

		yield (<Fragment>{children}</Fragment>);
	}
}

//TODO: type script correctly
export async function Script(this: Context, props: Record<string, any>) {
	const storage: Storage = this.get(StorageKey);
	if (storage == null) {
		throw new Error("Storage not found");
	}

	const src = await storage.url(props.src);
	return <script src={"/" + src} />;
}
