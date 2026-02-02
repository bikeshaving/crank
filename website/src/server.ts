import * as Path from "path";
import * as FS from "fs/promises";

import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/html";
import {Router} from "@b9g/router";
import {trailingSlash} from "@b9g/router/middleware";
import {assets as assetsMiddleware} from "@b9g/assets/middleware";

import {collectDocuments} from "./models/document.js";

// Import views
import HomeView from "./views/home.js";
import BlogHomeView from "./views/blog-home.js";
import BlogView from "./views/blog.js";
import GuideView from "./views/guide.js";
import APIView from "./views/api.js";
import PlaygroundView from "./views/playground.js";
import NotFoundView from "./views/not-found.js";

// Import assets with assetBase for content-hashed URLs
import clientCSS from "./styles/client.css" with {assetBase: "/static/"};
import navbarScript from "./clients/navbar.ts" with {assetBase: "/static/"};
import codeBlocksScript from "./clients/code-blocks.ts" with {
	assetBase: "/static/",
};
import playgroundScript from "./clients/playground.ts" with {
	assetBase: "/static/",
};
import searchScript from "./clients/search.ts" with {assetBase: "/static/"};
import favicon from "../static/favicon.ico" with {assetBase: "/static/"};
import logo from "../static/logo.svg" with {assetBase: "/static/"};

// Import Crank client bundles for playground iframe
import crankModule from "./clients/crank/index.ts" with {assetBase: "/static/"};
import crankAsyncModule from "./clients/crank/async.ts" with {
	assetBase: "/static/",
};
import crankDomModule from "./clients/crank/dom.ts" with {
	assetBase: "/static/",
};
import crankEventTargetModule from "./clients/crank/event-target.ts" with {
	assetBase: "/static/",
};
import crankHtmlModule from "./clients/crank/html.ts" with {
	assetBase: "/static/",
};
import crankJsxDevRuntimeModule from "./clients/crank/jsx-dev-runtime.ts" with {
	assetBase: "/static/",
};
import crankJsxRuntimeModule from "./clients/crank/jsx-runtime.ts" with {
	assetBase: "/static/",
};
import crankJsxTagModule from "./clients/crank/jsx-tag.ts" with {
	assetBase: "/static/",
};
import crankStandaloneModule from "./clients/crank/standalone.ts" with {
	assetBase: "/static/",
};

// Export logger for custom app logging
export const logger = self.loggers.get(["shovel", "crank-website"]);

// Export asset URLs for use in views
export const assets = {
	clientCSS,
	navbarScript,
	codeBlocksScript,
	playgroundScript,
	searchScript,
	favicon,
	logo,
};

// Static URLs for playground iframe (maps module specifiers to bundled URLs)
export const staticURLs: Record<string, string> = {
	"client.css": clientCSS,
	"@b9g/crank": crankModule,
	"@b9g/crank/async": crankAsyncModule,
	"@b9g/crank/dom": crankDomModule,
	"@b9g/crank/event-target": crankEventTargetModule,
	"@b9g/crank/html": crankHtmlModule,
	"@b9g/crank/jsx-dev-runtime": crankJsxDevRuntimeModule,
	"@b9g/crank/jsx-runtime": crankJsxRuntimeModule,
	"@b9g/crank/jsx-tag": crankJsxTagModule,
	"@b9g/crank/standalone": crankStandaloneModule,
};

const __dirname = new URL(".", import.meta.url).pathname;

// Create router
const router = new Router();

// Request logging middleware
const requestLogger = self.loggers.get(["shovel", "crank-website"]);
router.use(async (request) => {
	const url = new URL(request.url);
	requestLogger.info("{method} {path}", {
		method: request.method,
		path: url.pathname,
	});
	return;
});

// Strip trailing slashes (redirect /path/ → /path)
router.use(trailingSlash("strip"));

// Redirects for renamed URLs (handled in middleware to avoid router conflicts)
const redirects: Record<string, string> = {
	"/guides/special-props-and-tags": "/guides/special-props-and-components",
};

router.use(async (request) => {
	const url = new URL(request.url);
	const newPath = redirects[url.pathname];
	if (newPath) {
		return new Response(null, {
			status: 301,
			headers: {Location: newPath},
		});
	}
	return;
});

// Setup assets middleware to serve /static/ files
router.use(assetsMiddleware());

// Serve raw static files (images, etc.) from the static directory
const staticDir = Path.join(__dirname, "../static");
const mimeTypes: Record<string, string> = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".mp3": "audio/mpeg",
	".webp": "image/webp",
};

router.route("/static/:filename").get(async (request, context) => {
	const {filename} = context.params;
	const filePath = Path.join(staticDir, filename);

	// Security: prevent directory traversal
	if (!filePath.startsWith(staticDir)) {
		return new Response("Forbidden", {status: 403});
	}

	try {
		const content = await FS.readFile(filePath);
		const ext = Path.extname(filename).toLowerCase();
		const contentType = mimeTypes[ext] || "application/octet-stream";

		return new Response(content, {
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "public, max-age=31536000",
			},
		});
	} catch {
		return new Response("Not Found", {status: 404});
	}
});

// Serve pagefind files (generated by static build)
const pagefindDir = Path.join(__dirname, "../dist/public/pagefind");
router.route("/pagefind/:path*").get(async (request, context) => {
	const filePath = Path.join(pagefindDir, context.params.path || "");

	// Security: prevent directory traversal
	if (!filePath.startsWith(pagefindDir)) {
		return new Response("Forbidden", {status: 403});
	}

	try {
		const content = await FS.readFile(filePath);
		const ext = Path.extname(filePath).toLowerCase();
		const contentType =
			ext === ".js"
				? "application/javascript"
				: ext === ".css"
					? "text/css"
					: ext === ".pf_meta" || ext === ".pf_fragment" || ext === ".pf_index"
						? "application/octet-stream"
						: "application/octet-stream";

		return new Response(content, {
			headers: {"Content-Type": contentType},
		});
	} catch {
		return new Response("Not Found (run static build first)", {status: 404});
	}
});

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

router.route("/api").get(async (request) => {
	const url = new URL(request.url);
	return renderView(APIView, url.pathname);
});

router.route("/api/:module").get(async (request, context) => {
	const url = new URL(request.url);
	return renderView(APIView, url.pathname, context.params);
});

router.route("/api/:module/:category/:slug").get(async (request, context) => {
	const url = new URL(request.url);
	return renderView(APIView, url.pathname, context.params);
});

router.route("/playground").get(async (request) => {
	const url = new URL(request.url);
	return renderView(PlaygroundView, url.pathname);
});

// 404 catch-all (must be last)
router.route("*").all(async (request) => {
	const url = new URL(request.url);
	const html = await renderer.render(jsx`
		<${NotFoundView} url=${url.pathname} params=${{}} />
	`);
	return new Response(html, {
		status: 404,
		headers: {"Content-Type": "text/html"},
	});
});

// ServiceWorker fetch event
self.addEventListener("fetch", (event) => {
	event.respondWith(router.handle(event.request));
});

// ServiceWorker install event for static site generation
self.addEventListener("install", (event) => {
	event.waitUntil(generateStaticSite());
});

async function generateStaticSite() {
	if (import.meta.env.MODE !== "production") {
		return;
	}

	const logger = self.loggers.get(["shovel", "crank-website"]);
	logger.info("Starting static site generation...");

	try {
		const staticBucket = await self.directories.open("public");

		// Static routes (landing pages that need index.html at directory root)
		const staticRoutes = ["/", "/blog", "/playground", "/api"];

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

		const apiDocs = await collectDocuments(
			Path.join(__dirname, "../../docs/api"),
			Path.join(__dirname, "../../docs"),
		);
		staticRoutes.push(...apiDocs.map((doc) => doc.url));

		logger.info(`Pre-rendering ${staticRoutes.length} routes...`);

		// Generate 404 page
		const notFoundResponse = await fetch("/404.html");
		const notFoundHtml = await notFoundResponse.text();
		const notFoundHandle = await staticBucket.getFileHandle("404.html", {
			create: true,
		});
		const notFoundWritable = await notFoundHandle.createWritable();
		await notFoundWritable.write(notFoundHtml);
		await notFoundWritable.close();
		logger.info("Generated 404.html");

		for (const route of staticRoutes) {
			try {
				const response = await fetch(route);

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

					logger.info(`Generated ${route} -> ${filePath}`);
				}
			} catch (error: any) {
				logger.error(`Failed to generate ${route}:`, error.message);
			}
		}

		// Copy raw static files (images, etc.)
		const staticFilesDir = await staticBucket.getDirectoryHandle("static", {
			create: true,
		});
		const staticFiles = await FS.readdir(staticDir);
		for (const filename of staticFiles) {
			try {
				const content = await FS.readFile(Path.join(staticDir, filename));
				const fileHandle = await staticFilesDir.getFileHandle(filename, {
					create: true,
				});
				const writable = await fileHandle.createWritable();
				await writable.write(content);
				await writable.close();
				logger.info(`Copied static/${filename}`);
			} catch (error: any) {
				logger.error(`Failed to copy static/${filename}:`, error.message);
			}
		}

		// Generate redirect HTML files for old URLs
		for (const [oldPath, newPath] of Object.entries(redirects)) {
			const redirectHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Redirecting...</title>
<meta http-equiv="refresh" content="0; url=${newPath}">
<link rel="canonical" href="${newPath}">
</head>
<body>
<p>Redirecting to <a href="${newPath}">${newPath}</a>...</p>
</body>
</html>`;

			const filePath = `${oldPath.slice(1)}/index.html`;
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
			await writable.write(redirectHtml);
			await writable.close();
			logger.info(`Generated redirect ${oldPath} -> ${newPath}`);
		}

		logger.info("Static site generation complete!");
	} catch (error: any) {
		logger.error("Static site generation failed: {error}", {error});
	}
}
