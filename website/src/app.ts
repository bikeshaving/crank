import * as Path from "path";

import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/html";
import {Router, trailingSlash} from "@b9g/router";
import {assets as assetsMiddleware} from "@b9g/assets/middleware";

import {collectDocuments} from "./models/document.js";

// Import views
import HomeView from "./views/home.js";
import BlogHomeView from "./views/blog-home.js";
import BlogView from "./views/blog.js";
import GuideView from "./views/guide.js";
import PlaygroundView from "./views/playground.js";

// Import assets with assetBase for content-hashed URLs
import clientCSS from "./styles/client.css" with {assetBase: "/static/"};
import navbarScript from "./clients/navbar.ts" with {assetBase: "/static/"};
import codeBlocksScript from "./clients/code-blocks.ts" with {assetBase: "/static/"};
import playgroundScript from "./clients/playground.ts" with {assetBase: "/static/"};
import favicon from "../static/favicon.ico" with {assetBase: "/static/"};
import logo from "../static/logo.svg" with {assetBase: "/static/"};

// Import Crank client bundles for playground iframe
import crankModule from "./clients/crank/index.ts" with {assetBase: "/static/"};
import crankDomModule from "./clients/crank/dom.ts" with {assetBase: "/static/"};
import crankHtmlModule from "./clients/crank/html.ts" with {assetBase: "/static/"};
import crankStandaloneModule from "./clients/crank/standalone.ts" with {assetBase: "/static/"};

// Export asset URLs for use in views
export const assets = {
	clientCSS,
	navbarScript,
	codeBlocksScript,
	playgroundScript,
	favicon,
	logo,
};

// Static URLs for playground iframe (maps module specifiers to bundled URLs)
export const staticURLs: Record<string, string> = {
	"client.css": clientCSS,
	"@b9g/crank": crankModule,
	"@b9g/crank.js": crankModule,
	"@b9g/crank/dom": crankDomModule,
	"@b9g/crank/dom.js": crankDomModule,
	"@b9g/crank/html": crankHtmlModule,
	"@b9g/crank/html.js": crankHtmlModule,
	"@b9g/crank/standalone": crankStandaloneModule,
	"@b9g/crank/standalone.js": crankStandaloneModule,
};

const __dirname = new URL(".", import.meta.url).pathname;

// Create router
const router = new Router();

// Strip trailing slashes (redirect /path/ → /path)
router.use(trailingSlash("strip"));

// Setup assets middleware to serve /static/ files
router.use(assetsMiddleware());

// Helper to render a Crank view
async function renderView(
	View: any,
	url: string,
	params: Record<string, string> = {},
): Promise<Response> {
	const html = await renderer.render(jsx`
		<${View}
			url=${url}
			params=${params}
		/>
	`);

	return new Response(html, {
		headers: {"Content-Type": "text/html"},
	});
}

// Routes
router.route("/").get(async (request) => {
	const url = new URL(request.url);
	return renderView(HomeView, url.pathname);
});

router.route("/blog").get(async (request) => {
	const url = new URL(request.url);
	return renderView(BlogHomeView, url.pathname);
});

router.route("/blog/:slug").get(async (request, context) => {
	const url = new URL(request.url);
	return renderView(BlogView, url.pathname, context.params);
});

router.route("/guides/:slug").get(async (request, context) => {
	const url = new URL(request.url);
	return renderView(GuideView, url.pathname, context.params);
});

router.route("/playground").get(async (request) => {
	const url = new URL(request.url);
	return renderView(PlaygroundView, url.pathname);
});

// ServiceWorker fetch event
self.addEventListener("fetch", (event) => {
	event.respondWith(router.handler(event.request));
});

// ServiceWorker activate event for static site generation
self.addEventListener("activate", (event) => {
	event.waitUntil(generateStaticSite());
});

async function generateStaticSite() {
	console.info("[Crank Website] Starting static site generation...");

	try {
		const staticBucket = await self.buckets.open("static");

		// Static routes
		const staticRoutes = ["/", "/blog", "/playground"];

		// Collect blog and guide documents
		const blogDocs = await collectDocuments(
			Path.join(__dirname, "../../docs/blog"),
			Path.join(__dirname, "../../docs"),
		);
		staticRoutes.push(...blogDocs.map((doc) => doc.url));

		const guideDocs = await collectDocuments(
			Path.join(__dirname, "../../docs/guides"),
			Path.join(__dirname, "../../docs"),
		);
		staticRoutes.push(...guideDocs.map((doc) => doc.url));

		console.info(
			`[Crank Website] Pre-rendering ${staticRoutes.length} routes...`,
		);

		for (const route of staticRoutes) {
			try {
				const request = new Request(`http://localhost${route}`);
				const response = await router.handler(request);

				if (response.ok) {
					const content = await response.text();
					// Generate proper directory structure for static servers
					// /blog/slug -> blog/slug/index.html
					const filePath =
						route === "/" ? "index.html" : `${route.slice(1)}/index.html`;

					// Create nested directories if needed
					const parts = filePath.split("/");
					let currentDir = staticBucket;
					for (let i = 0; i < parts.length - 1; i++) {
						currentDir = await currentDir.getDirectoryHandle(parts[i], {
							create: true,
						});
					}

					const fileName = parts[parts.length - 1];
					const fileHandle = await currentDir.getFileHandle(fileName, {
						create: true,
					});
					const writable = await fileHandle.createWritable();
					await writable.write(content);
					await writable.close();

					console.info(`[Crank Website] Generated ${route} -> ${filePath}`);
				}
			} catch (error: any) {
				console.error(`[Crank Website] Failed to generate ${route}:`, error.message);
			}
		}

		console.info("[Crank Website] Static site generation complete!");
	} catch (error: any) {
		console.error("[Crank Website] Static site generation failed:", error.message);
	}
}
