import fs from "fs-extra";
import type {Stats} from "fs";
import * as path from "path";
import frontmatter from "front-matter";

interface WalkInfo {
	filename: string;
	stats: Stats;
}

async function* walk(dir: string): AsyncGenerator<WalkInfo> {
	const files = await fs.readdir(dir);
	for (let filename of files) {
		filename = path.join(dir, filename);
		const stats = await fs.stat(filename);
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
		publishDate?: Date;
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
			const md = await fs.readFile(filename, {encoding: "utf8"});
			let {attributes, body} = frontmatter(md) as unknown as DocInfo;
			attributes.publish =
				attributes.publish == null ? true : attributes.publish;
			if (attributes.publishDate != null) {
				attributes.publishDate = new Date(attributes.publishDate);
			}

			const url = path
				.join("/", path.relative(rootPathname, filename))
				.replace(/\.md$/, "")
				.replace(/([0-9]+-)+/, "");
			docs.push({url, filename, body, attributes});
		}
	}

	return docs;
}
