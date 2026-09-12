/* eslint-disable no-console */
/**
 * Crawls the built static site and verifies all internal links resolve to
 * actual files. Exits with code 1 if any broken links are found.
 */

import {Glob} from "bun";
import {existsSync} from "node:fs";
import {resolve, dirname, join} from "node:path";

const ROOT = resolve(import.meta.dirname, "../dist/public");
const glob = new Glob("**/*.html");
const hrefRe = /\bhref\s*=\s*"([^"#]*)(?:#[^"]*)?"/gi;

const broken: Array<{file: string; href: string}> = [];
let linkCount = 0;

for await (const path of glob.scan(ROOT)) {
	const file = join(ROOT, path);
	const html = await Bun.file(file).text();
	let match;
	while ((match = hrefRe.exec(html)) !== null) {
		const href = match[1];
		if (
			!href ||
			href.startsWith("http://") ||
			href.startsWith("https://") ||
			href.startsWith("mailto:")
		) {
			continue;
		}

		linkCount++;
		// Resolve the href relative to the file's directory or the site root
		const target = href.startsWith("/")
			? join(ROOT, href)
			: join(dirname(file), href);

		// Check for exact file, index.html inside directory, or .html extension
		const exists =
			existsSync(target) ||
			existsSync(join(target, "index.html")) ||
			existsSync(target + ".html");

		if (!exists) {
			broken.push({file: path, href});
		}
	}
}

console.log(`Checked ${linkCount} internal links across ${ROOT}`);

if (broken.length > 0) {
	console.error(`\nFound ${broken.length} broken link(s):\n`);
	for (const {file, href} of broken) {
		console.error(`  ${file} → ${href}`);
	}
	process.exit(1);
} else {
	console.log("All links OK.");
}
