import * as Path from "path";
import {Blob} from "buffer";
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
		const path = new URL(req.url).pathname;
		if (path.startsWith(storage.publicPath)) {
			const source = await storage.serve(path);
			const mimeType = MimeTypes.lookup(path) || "application/octet-stream";
			const charset = MimeTypes.charset(mimeType) || "binary";
			if (source) {
				const blob = new Blob([source], {
					type: `${mimeType}; charset=${charset}`,
				});
				return new Response(blob, {
					status: 200,
					headers: {
						"Content-Type": `${mimeType}; charset=${charset}`,
					},
				});
			} else {
				return new Response("Not found", {status: 404});
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
		yield* ["/", "/blog", "/playground"];
		const blogDocs = await collectDocuments(
			Path.join(__dirname, "../documents/blog"),
			Path.join(__dirname, "../documents"),
		);
		yield* blogDocs.map((doc) => doc.url);

		const guideDocs = await collectDocuments(
			Path.join(__dirname, "../documents/guides"),
			Path.join(__dirname, "../documents"),
		);
		yield* guideDocs.map((doc) => doc.url);
		await storage.write(Path.join(outDir, storage.publicPath));
		storage.clear();
	},
};
