import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/html";
import {renderStylesToString} from "@emotion/server";

import {Route} from "@b9g/shovel/router";
import {Storage} from "@b9g/shovel/storage";
import {collectDocuments} from "./models/document.js";

const __dirname = new URL(".", import.meta.url).pathname;
const routes = jsx`
	<${Route} path="/">
		<${HomeView} />
	<//Route>
	<${Route} path="/blog">
		<${Route} path="">
			<${BlogHomeView} />
		<//Route>
		<${Route} path="/:slug">
			<${BlogView} />
		<//Route>
	<//Route>
	<${Route} path="/guides/:slug">
		<${GuideView} />
	<//Route>
	<${Route} path="/playground">
		<${PlaygroundView} />
	<//Route>
`;

export default {
	async fetch(req: Request) {
		console.info("Serving:", req.url);
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

		let html = await renderer.render(jsx`
			<${HTML5}>
				<${Response} req=${req} storage=${storage}>
					${routes}
				<//Response>
			<//HTML5>
		`);

		// Could be a middleware
		html = renderStylesToString(html);
		return new Response(html, {
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
	},
};
