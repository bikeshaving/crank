import FS from "fs/promises";
import type {Stats} from "fs";
import * as Path from "path";
import frontmatter from "front-matter";

interface WalkInfo {
	filename: string;
	stats: Stats;
}

async function* walk(dir: string): AsyncGenerator<WalkInfo> {
	const files = (await FS.readdir(dir)).sort();
	for (let filename of files) {
		filename = Path.join(dir, filename);
		const stats = await FS.stat(filename);
		if (stats.isDirectory()) {
			yield* walk(filename);
		} else if (stats.isFile()) {
			yield {filename, stats};
		}
	}
}

// TODO: better name
export interface DocInfo {
	attributes: {
		title: string;
		publish: boolean;
		author?: string;
		authorURL?: string;
		publishDate?: Date;
		description?: string;
	};
	url: string;
	filename: string;
	body: string;
}

// TODO: better name
export async function collectDocuments(
	pathname: string,
	rootPathname: string = pathname,
): Promise<Array<DocInfo>> {
	let docs: Array<DocInfo> = [];
	for await (const {filename} of walk(pathname)) {
		if (filename.endsWith(".md")) {
			const md = await FS.readFile(filename, {encoding: "utf8"});
			let {attributes, body} = frontmatter(md) as unknown as DocInfo;
			attributes.publish =
				attributes.publish == null ? true : attributes.publish;
			if (attributes.publishDate != null) {
				attributes.publishDate = new Date(attributes.publishDate);
			}

			const url = Path.join("/", Path.relative(rootPathname, filename))
				.replace(/\.md$/, "")
				.replace(/([0-9]+-)+/, "")
				.replace(/\/index$/, ""); // index.md -> parent directory URL
			docs.push({url, filename, body, attributes});
		}
	}

	return docs;
}
