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
	private compiler?: webpack.Compiler;
	private runResult?: Promise<webpack.Stats.ToJsonOutput>;
	constructor(private dir: string) {
		if (!path.isAbsolute(dir)) {
			throw new Error(`path ${dir} is not absolute`);
		}
	}

	private run(): Promise<webpack.Stats.ToJsonOutput> {
		if (this.compiler === undefined) {
			throw new Error("this.compiler is not defined");
		} else if (this.runResult === undefined) {
			this.runResult = new Promise((resolve, reject) => {
				this.compiler!.run((err, stats) => {
					if (err) {
						reject(err);
					} else {
						resolve(stats.toJson());
					}
				});
			});
		}

		return this.runResult;
	}

	async url(name: string): Promise<string | undefined> {
		if (!isWithinDir(this.dir, name)) {
			throw new Error("Attempting to access a file outside the provided directory");
		}

		name = "./" + path.resolve(this.dir, name).replace(new RegExp("^" + this.dir + "/"), "");
		if (this.compiler === undefined) {
			const entry = {[name]: name};
			this.compiler = webpack({...config, entry, context: this.dir});
		} else {
			const entry: Record<string, string> = this.compiler.options.entry as any;
			entry[name] = name;
		}

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
	// TODO: use typed contexts
	const storage: Storage = this.get(StorageKey);
	if (storage == null) {
		throw new Error("Storage not found");
	}

	const src = await storage.url(props.src);
	return <script {...props} src={"/" + src} />;
}
