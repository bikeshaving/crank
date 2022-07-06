import fs from "fs-extra";
import * as path from "path";
import * as ESBuild from "esbuild";
import * as mime from "mime-types";

// TODO: Pass plugins into storage or components
import postcssPlugin from "./esbuild/postcss-plugin.js";
import postcssPresetEnv from "postcss-preset-env";
import postcssNested from "postcss-nested";

function isWithinDir(dir: string, name: string) {
	const resolved = path.resolve(dir, name);
	return resolved.startsWith(dir);
}

type CachedResult = ESBuild.BuildResult & {
	outputFiles: Array<ESBuild.OutputFile>;
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
			minify: false,
			allowOverwrite: true,
			outbase: this.dirname,
			outdir: this.dirname,
			sourcemap: true,
			plugins: [
				postcssPlugin({plugins: [postcssPresetEnv() as any, postcssNested()]}),
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

import type {Children, Context} from "@b9g/crank/crank.js";
import {t} from "@b9g/crank/template.js";
// TODO: Move components to their own file
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

// TODO: Better name
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
	return t`<script src=${src} ...${props} />`;
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
	return t`<link href=${href} rel=${rel} ...${props} />`;
}
