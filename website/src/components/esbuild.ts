import * as FS from "fs/promises";
import * as Path from "path";
import * as ESBuild from "esbuild";
import type {BuildContext, OutputFile} from "esbuild";

import {jsx} from "@b9g/crank/standalone";
import type {Children, Context} from "@b9g/crank";

import {NodeModulesPolyfillPlugin} from "@esbuild-plugins/node-modules-polyfill";
import {NodeGlobalsPolyfillPlugin} from "@esbuild-plugins/node-globals-polyfill";

import postcssPresetEnv from "postcss-preset-env";
import postcssNested from "postcss-nested";
// TODO: Pass plugins into storage or components
import {postcssPlugin} from "../plugins/esbuild.js";

async function copy(src: string, dest: string): Promise<void> {
	await FS.mkdir(dest, {recursive: true});
	const files = await FS.readdir(src);
	for (const file of files) {
		const srcPath = Path.join(src, file);
		const destPath = Path.join(dest, file);
		const stat = await FS.stat(srcPath);
		if (stat.isFile()) {
			await FS.copyFile(srcPath, destPath);
		} else if (stat.isDirectory()) {
			await copy(srcPath, destPath);
		}
	}
}

function isWithinDir(dir: string, name: string) {
	const resolved = Path.resolve(dir, name);
	return resolved.startsWith(dir);
}

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
	cache: Map<string, BuildContext>;

	constructor({
		dirname,
		publicPath = "/static/",
		staticPaths = [],
	}: StorageOptions) {
		if (!Path.isAbsolute(dirname)) {
			throw new Error(`path (${dirname}) is not absolute`);
		}

		for (const staticPath of staticPaths) {
			if (!Path.isAbsolute(staticPath)) {
				throw new Error(`path (${staticPath}) is not absolute`);
			}
		}

		this.dirname = Path.normalize(dirname);
		this.publicPath = publicPath;
		this.staticPaths = staticPaths;
		this.cache = new Map();
	}

	async build(
		filename: string,
		options: Partial<ESBuild.BuildOptions> = {},
	): Promise<Array<OutputFile>> {
		let ctx = this.cache.get(filename);
		if (ctx == null) {
			const entryname = Path.resolve(this.dirname, filename);
			ctx = await ESBuild.context({
				// TODO: pass these in via components
				entryNames: "[name]-[hash]",
				bundle: true,
				write: false,
				minify: false,
				format: "iife",
				outbase: this.dirname,
				outdir: this.dirname,
				sourcemap: true,
				plugins: [
					NodeModulesPolyfillPlugin(),
					NodeGlobalsPolyfillPlugin({buffer: true}),
					postcssPlugin({
						plugins: [postcssPresetEnv() as any, postcssNested()],
					}),
				],
				...options,
				entryPoints: [entryname],
			});

			this.cache.set(filename, ctx);
		} else if (!isWithinDir(this.dirname, filename)) {
			throw new Error("filename outside directory");
		}

		const result = await ctx.rebuild();
		return result.outputFiles || [];
	}

	async url(
		filename: string,
		extension: string,
		options: Partial<ESBuild.BuildOptions> = {},
	): Promise<string> {
		const outputs = await this.build(filename, options);
		const output = outputs.find((output) => output.path.endsWith(extension));
		if (!output) {
			// TODO: More descriptive error message
			throw new Error("Unknown extension");
		}

		return Path.posix.join(
			this.publicPath,
			Path.relative(this.dirname, output.path),
		);
	}

	async write(dirname: string): Promise<void> {
		await FS.mkdir(dirname, {recursive: true});

		const outputs: Array<OutputFile> = [];
		for (const ctx of this.cache.values()) {
			const result = await ctx.rebuild();
			outputs.push(...(result.outputFiles || []));
		}

		await Promise.all(
			outputs.map(async (output) => {
				const outputPath = Path.relative(this.dirname, output.path);
				const filename = Path.join(dirname, outputPath);
				await FS.writeFile(filename, output.contents);
			}),
		);

		await Promise.all(
			this.staticPaths.map(async (staticPath) => {
				//await FS.copy(staticPath, dirname);
				// copy all files under staticPath to dirname
				//
				await copy(staticPath, dirname);
			}),
		);
	}

	async serve(inputPath: string): Promise<Uint8Array | null> {
		inputPath = inputPath.replace(new RegExp("^" + this.publicPath), "");
		const outputs: Array<OutputFile> = [];
		for (const ctx of this.cache.values()) {
			const result = await ctx.rebuild();
			outputs.push(...(result.outputFiles || []));
		}

		for (const output of outputs) {
			const outputPath = Path.relative(this.dirname, output.path);
			if (inputPath === outputPath) {
				return output.contents;
			}
		}

		for (const staticPath of this.staticPaths) {
			try {
				return await FS.readFile(Path.join(staticPath, inputPath));
			} catch (err: any) {
				if (err.code !== "ENOENT") {
					throw err;
				}
			}
		}

		return null;
	}

	clear(): void {
		for (const ctx of this.cache.values()) {
			ctx.dispose();
		}
	}
}

export const StorageKey = Symbol.for("esbuild.StorageKey");
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
	src = await storage.url(src, ".js", {
		format: props.type === "module" ? "esm" : "iife",
	});
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
	href = await storage.url(href, ".css", {
		format: props.type === "module" ? "esm" : "iife",
	});
	return jsx`<link href=${href} rel=${rel} ...${props} />`;
}
