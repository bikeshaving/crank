import fs from "fs-extra";
import * as path from "path";
import {build} from "esbuild";
import type {BuildResult, OutputFile} from "esbuild";
import * as mime from "mime-types";

// TODO: Pass plugins into storage or components
import postcssPlugin from "./esbuild/postcss-plugin.js";
import postcssPresetEnv from "postcss-preset-env";
import postcssNested from "postcss-nested";

// TODO: figure out why the ESM interop is busted
import NodeModulesPolyfills from "@esbuild-plugins/node-modules-polyfill";
import NodeGlobalsPolyfills from "@esbuild-plugins/node-globals-polyfill";

function isWithinDir(dir: string, name: string) {
	const resolved = path.resolve(dir, name);
	return resolved.startsWith(dir);
}

// We need this type because it can’t really be inferred from the ESBuild types.
type CachedResult = BuildResult & {
	outputFiles: Array<OutputFile>;
};

// TODO: better names for these options
export interface StorageOptions {
	dirname: string;
	publicPath?: string | undefined;
	staticPaths?: Array<string> | undefined;
}

export class Storage {
	dirname: string;
	publicPath: string;
	staticPaths: Array<string>;
	cache: Map<string, CachedResult>;

	constructor({
		dirname,
		publicPath = "/static/",
		staticPaths = [],
	}: StorageOptions) {
		if (!path.isAbsolute(dirname)) {
			throw new Error(`path (${dirname}) is not absolute`);
		}

		for (const staticPath of staticPaths) {
			if (!path.isAbsolute(staticPath)) {
				throw new Error(`path (${staticPath}) is not absolute`);
			}
		}

		this.dirname = path.normalize(dirname);
		this.publicPath = publicPath;
		this.staticPaths = staticPaths;
		this.cache = new Map();
	}

	async build(filename: string): Promise<Array<OutputFile>> {
		let result = this.cache.get(filename);
		if (result != null) {
			return result.outputFiles;
		} else if (!isWithinDir(this.dirname, filename)) {
			throw new Error("filename outside directory");
		}

		const entryname = path.resolve(this.dirname, filename);
		result = await build({
			entryPoints: [entryname],
			entryNames: "[name]-[hash]",
			bundle: true,
			write: false,
			minify: false,
			outbase: this.dirname,
			outdir: this.dirname,
			sourcemap: true,
			plugins: [
				postcssPlugin({plugins: [postcssPresetEnv() as any, postcssNested()]}),
				// @ts-ignore
				NodeModulesPolyfills.default(),
				// @ts-ignore
				NodeGlobalsPolyfills.default({
					buffer: true,
				}),
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

	async url(filename: string, extension: string): Promise<string> {
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
		await fs.ensureDir(dirname);
		const outputs = Array.from(this.cache.values()).flatMap(
			(result) => result.outputFiles,
		);

		await Promise.all(
			outputs.map(async (output) => {
				const outputPath = path.relative(this.dirname, output.path);
				const filename = path.join(dirname, outputPath);
				await fs.writeFile(filename, output.contents);
			}),
		);

		await Promise.all(
			this.staticPaths.map(async (staticPath) => {
				await fs.copy(staticPath, dirname);
			}),
		);
	}

	async serve(inputPath: string): Promise<Uint8Array | string | null> {
		inputPath = inputPath.replace(new RegExp("^" + this.publicPath), "");
		const outputs = Array.from(this.cache.values()).flatMap(
			(result) => result.outputFiles,
		);

		for (const output of outputs) {
			const outputPath = path.relative(this.dirname, output.path);
			if (inputPath === outputPath) {
				return output.contents;
			}
		}

		for (const staticPath of this.staticPaths) {
			try {
				const mimeType = mime.lookup(inputPath) || "application/octet-stream";
				const charset = mime.charset(mimeType) || "binary";
				return await fs.readFile(path.join(staticPath, inputPath), charset);
			} catch (err: any) {
				if (err.code !== "ENOENT") {
					throw err;
				}
			}
		}

		return null;
	}

	clear(): void {
		for (const result of this.cache.values()) {
			result.stop!();
		}
	}
}

import type {Children, Context} from "@b9g/crank";
import {jsx} from "@b9g/crank";

// TODO: Move components to their own file?
// While it’s cool that we can use provisions and components here, I’m not sure
// what the advantage is of defining these separate components over calling
// async functions to get URLs from local file paths. ESBuild has a neat design
// principle which is that the only way to actually “concatenate” files is to
// have an actual source file which imports all the files you’re trying to
// concatenate together. The thing I’m thinking about now, is how do we
// concretely bundle dependencies for those which are generated from
// components.
const StorageKey = Symbol.for("esbuild.StorageKey");
declare global {
	namespace Crank {
		interface ProvisionMap {
			[StorageKey]: Storage;
		}
	}
}

export interface PageProps {
	storage: Storage;
	children: Children;
}

// TODO: Better name than “Page”
export function* Page(this: Context, {storage, children}: PageProps) {
	this.provide(StorageKey, storage);
	let newStorage: Storage;
	for ({storage: newStorage} of this) {
		if (storage !== newStorage) {
			this.provide(StorageKey, newStorage);
			storage = newStorage;
		}

		yield children;
	}
}

export async function Script(this: Context, props: Record<string, any>) {
	const storage = this.consume(StorageKey);
	if (storage == null) {
		throw new Error("Storage not found");
	}

	let src: string;
	({src, ...props} = props);
	src = await storage.url(src, ".js");
	return jsx`<script src=${src} ...${props} />`;
}

export async function Link(this: Context, props: Record<string, any>) {
	const storage = this.consume(StorageKey);
	if (storage == null) {
		throw new Error("Storage not found");
	}

	let href: string;
	let rel: string;
	({href, rel = "stylesheet", ...props} = props);
	href = await storage.url(href, ".css");
	return jsx`<link href=${href} rel=${rel} ...${props} />`;
}
