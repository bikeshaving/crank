import fs from "fs-extra";
import type {Stats} from "fs";

interface WalkInfo {
	filename: string;
	info: Stats;
}

async function* walk(dir: string): AsyncGenerator<WalkInfo> {
	const files = await fs.readdir(dir);
	for (let filename of files) {
		filename = path.join(dir, filename);
		const info = await fs.stat(filename);
		if (info.isDirectory()) {
			yield* walk(filename);
		} else if (info.isFile()) {
			yield {filename, info};
		}
	}
}

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

export async function collectDocuments(
	pathname: string,
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
				.join("/", path.relative(pathname, filename))
				.replace(/\.md$/, "")
				.replace(/([0-9]+-)+/, "");
			docs.push({url, filename, body, attributes});
		}
	}

	return docs;
}
