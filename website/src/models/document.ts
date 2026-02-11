import frontmatter from "front-matter";

interface WalkInfo {
	filename: string;
}

async function* walk(
	dir: FileSystemDirectoryHandle,
	basePath: string = "",
): AsyncGenerator<WalkInfo> {
	const entries: Array<[string, FileSystemHandle]> = [];
	for await (const entry of dir.entries()) {
		entries.push(entry);
	}
	entries.sort((a, b) => a[0].localeCompare(b[0]));

	for (const [name, handle] of entries) {
		const path = basePath ? `${basePath}/${name}` : name;
		if (handle.kind === "directory") {
			yield* walk(handle as FileSystemDirectoryHandle, path);
		} else if (handle.kind === "file") {
			yield {filename: path};
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
	dir: FileSystemDirectoryHandle,
	prefix?: string,
): Promise<Array<DocInfo>> {
	let docs: Array<DocInfo> = [];
	for await (const {filename} of walk(dir)) {
		if (filename.endsWith(".md")) {
			const fileHandle = await navigatePath(dir, filename);
			const file = await fileHandle.getFile();
			const md = await file.text();
			let {attributes, body} = frontmatter(md) as unknown as DocInfo;
			attributes.publish =
				attributes.publish == null ? true : attributes.publish;
			if (attributes.publishDate != null) {
				attributes.publishDate = new Date(attributes.publishDate);
			}

			const urlBase = prefix ? `/${prefix}` : "";
			const url = `${urlBase}/${filename}`
				.replace(/\.md$/, "")
				.replace(/([0-9]+-)+/, "")
				.replace(/\/index$/, ""); // index.md -> parent directory URL
			const docsRelativeFilename = prefix ? `${prefix}/${filename}` : filename;
			docs.push({url, filename: docsRelativeFilename, body, attributes});
		}
	}

	return docs;
}

async function navigatePath(
	dir: FileSystemDirectoryHandle,
	path: string,
): Promise<FileSystemFileHandle> {
	const parts = path.split("/");
	let current = dir;
	for (let i = 0; i < parts.length - 1; i++) {
		current = await current.getDirectoryHandle(parts[i]);
	}
	return current.getFileHandle(parts[parts.length - 1]);
}
