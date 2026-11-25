import {compile} from "./compile.ts";

export interface HotOptions {
	/**
	 * The path of the module, which the keys of its components start with. Its
	 * extension says whether the module has types and JSX.
	 */
	id: string;
	/**
	 * The specifier which the module imports the runtime from. It is
	 * "@b9g/crank-hot/runtime" by default.
	 */
	runtime?: string;
}

export interface HotResult {
	/**
	 * The module, in the language it was written in. The transform only adds
	 * to lines, and to the end of the module, so every line of the source is
	 * on the line it was written on.
	 */
	code: string;
	/**
	 * A source map from the code to the source, as JSON, with a place for
	 * every word of the source.
	 */
	map: string;
}

/**
 * Prepares a module for a development server which replaces modules in the
 * page with `import.meta.hot`. A module without components is returned as it
 * was.
 */
export function transform(source: string, options: HotOptions): HotResult {
	return compile(source, {id: options.id, runtime: options.runtime});
}
