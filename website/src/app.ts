import * as Path from "path";
import * as MimeTypes from "mime-types";

import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/html";
import {renderStylesToString} from "@emotion/server";

import {router} from "./routes.js";
import {Storage} from "./components/esbuild.js";
import {collectDocuments} from "./models/document.js";

const __dirname = new URL(".", import.meta.url).pathname;
const storage = new Storage({
	dirname: __dirname,
	staticPaths: [Path.join(__dirname, "../static")],
});

export default {
	async fetch(req: Request) {
		console.info("serving", req.url);
		const path = new URL(req.url).pathname;
		if (path.startsWith(storage.publicPath)) {
			const source = await storage.serve(path);
			const mimeType = MimeTypes.lookup(path) || "application/octet-stream";
			const charset = MimeTypes.charset(mimeType) || "binary";
			if (source) {
				return new Response(source, {
					status: 200,
					headers: {
						"Content-Type": `${mimeType}; charset=${charset}`,
					},
				});
			}
		}

		const match = router.match(path);
		if (match && match.View) {
			let html = await renderer.render(jsx`
				<${match.View}
					url=${path}
					params=${match.params}
					context=${{storage}}
				/>
			`);

			html = renderStylesToString(html);
			return new Response(html, {
				headers: {"Content-Type": "text/html"},
			});
		}

		return new Response("Page not found", {
			status: 404,
			headers: {"Content-Type": "text/html"},
		});
	},

	async *staticPaths(outDir) {
		yield *["/", "/blog"];
		const blogDocs = await collectDocuments(
			Path.join(__dirname, "../documents/blog"),
			Path.join(__dirname, "../documents"),
		);
		yield *blogDocs.map((doc) => `/blog/${doc.slug}`);
		const guideDocs = await collectDocuments(
			Path.join(__dirname, "../documents/guides"),
			Path.join(__dirname, "../documents"),
		);
		yield *guideURLs.map((doc) => `/guides/${doc.slug}`);
		await storage.write(outDir);
	},
};
