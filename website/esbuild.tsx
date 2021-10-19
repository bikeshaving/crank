/** @jsx createElement */
import {promises as fs} from "fs";
import * as path from "path";
import * as ESBuild from "esbuild";
import {createElement} from "@bikeshaving/crank/crank.js";
import type {Children, Context} from "@bikeshaving/crank/crank.js";
import postcssPlugin from "./postcss-plugin";
import postcssPresetEnv from "postcss-preset-env";
import postcssNested from "postcss-nested";

function isWithinDir(dir: string, name: string) {
	const resolved = path.resolve(dir, name);
	return resolved.startsWith(dir);
}

type CachedResult = ESBuild.BuildResult & {
	outputFiles: Array<ESBuild.OutputFile>;
};

export interface StorageOptions {
	dirname: string;
	publicPath?: string | undefined;
}

export class Storage {
	dirname: string;
	publicPath: string;
	cache: Map<string, CachedResult>;

	constructor({dirname, publicPath = "/static/"}: StorageOptions) {
		if (!path.isAbsolute(dirname)) {
			throw new Error(`path (${dirname}) is not absolute`);
		}

		this.dirname = path.normalize(dirname);
		this.publicPath = publicPath;
		this.cache = new Map();
	}

	async build(filename: string): Promise<Array<ESBuild.OutputFile>> {
		let result = this.cache.get(filename);
		if (result != null) {
			return result.outputFiles;
		} else if (!isWithinDir(this.dirname, filename)) {
			throw new Error("filename outside directory");
		}

		const entryname = path.resolve(this.dirname, filename);
		result = await ESBuild.build({
			entryPoints: [entryname],
			entryNames: "[name]-[hash]",
			bundle: true,
			write: false,
			allowOverwrite: true,
			outbase: this.dirname,
			outdir: this.dirname,
			sourcemap: "inline",
			plugins: [
				postcssPlugin({plugins: [postcssPresetEnv(), postcssNested()]}),
			],
			watch: {
				onRebuild: (error, result) => {
					if (error) {
						console.error(error);
					} else {
						this.cache.set(filename, result as CachedResult);
					}
				},
			},
		});

		this.cache.set(filename, result);
		return result.outputFiles;
	}

	async url(filename: string, extension: string): Promise<string | undefined> {
		const outputs = await this.build(filename);
		const output = outputs.find((output) => output.path.endsWith(extension));
		if (!output) {
			// TODO: More descriptive error message
			throw new Error("Unknown extension");
		}

		return path.posix.join(
			this.publicPath,
			path.relative(this.dirname, output.path),
		);
	}

	async write(dirname: string): Promise<void> {
		const outputs = Array.from(this.cache.values()).flatMap(
			(result) => result.outputFiles,
		);
		await Promise.all(
			outputs.map(async (output) => {
				const filename = path.join(
					dirname,
					path.relative(this.dirname, output.path),
				);

				await fs.writeFile(filename, output.contents);
			}),
		);
	}

	dispose(): void {
		for (const result of this.cache.values()) {
			result.stop!();
		}
	}
}

const StorageKey = Symbol.for("esbuild.StorageKey");

export interface PageProps {
	storage: Storage;
	children: Children;
}

export function* Page(this: Context, {storage, children}: PageProps) {
	this.provide(StorageKey, storage);
	let nextStorage: Storage;
	for ({storage: nextStorage} of this) {
		if (storage !== nextStorage) {
			this.provide(StorageKey, nextStorage);
			storage = nextStorage;
		}

		yield children;
	}
}

export async function Script(this: Context, props: Record<string, any>) {
	const storage: Storage = this.consume(StorageKey);
	if (storage == null) {
		throw new Error("Storage not found");
	}

	let {src, ...props1} = props;
	src = await storage.url(src, ".js");
	return <script src={src} {...props1} />;
}

export async function Link(this: Context, props: Record<string, any>) {
	const storage: Storage = this.consume(StorageKey);
	if (storage == null) {
		throw new Error("Storage not found");
	}

	const url = await storage.url(props.href, ".css");
	return <link rel="stylesheet" href={url} />;
}
