import {createServer} from "node:http";
import * as Path from "node:path";
import * as MimeTypes from "mime-types";
import process from "node:process";

import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/html";
import {renderStylesToString} from "@emotion/server";

//import {Request, Response} from "@remix-run/web-fetch";

import {router} from "./routes.js";
import {Storage} from "./components/esbuild.js";

const __dirname = new URL(".", import.meta.url).pathname;
const storage = new Storage({
	dirname: __dirname,
	staticPaths: [Path.join(__dirname, "../static")],
});

export default {
	fetch: async (req: Request) => {
		console.log("serving", req.url);
		const path = new URL(req.url).pathname;
		if (path.startsWith(storage.publicPath)) {
			const source = await storage.serve(path);
			const mimeType = MimeTypes.lookup(path) || "application/octet-stream";
			const charset = MimeTypes.charset(mimeType) || "binary";
			if (source) {
				return new Response(source, {
					status: 200,
					headers: {
						"Content-Type": mimeType,
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
}
