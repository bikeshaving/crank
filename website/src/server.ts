// Ensure Prism global is set before loading language grammars for SSR.
// prism.ts sets globalThis.Prism; language components are CJS side-effect
// modules that reference the global.
import "./utils/prism.js";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-diff";
import "prismjs/components/prism-bash";

import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/html";
import {Router} from "@b9g/router";
import {trailingSlash} from "@b9g/router/middleware";
import {assets as assetsMiddleware} from "@b9g/assets/middleware";

import {collectDocuments, type DocInfo} from "./models/document.js";

// Import views
import HomeView from "./views/home.js";
import BlogHomeView from "./views/blog-home.js";
import BlogView from "./views/blog.js";
import GuideView from "./views/guide.js";
import APIView from "./views/api.js";
import PlaygroundView from "./views/playground.js";
import PressKitView from "./views/press-kit.js";
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
import gearScript from "./clients/gear.ts" with {assetBase: "/static/"};
import favicon from "../static/favicon.ico" with {
	assetBase: "/",
	assetName: "favicon.ico",
};
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
export const logger = self.loggers.get(["app", "crank-website"]);

// Export asset URLs for use in views
export const assets = {
	clientCSS,
	navbarScript,
	codeBlocksScript,
	playgroundScript,
	searchScript,
	gearScript,
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

// Create router
const router = new Router();

// Request logging middleware
const requestLogger = self.loggers.get(["app", "crank-website"]);
router.use(async (request) => {
	const url = new URL(request.url);
	requestLogger.info("{method} {path}", {
		method: request.method,
		path: url.pathname,
	});
	return;
});

// Append trailing slashes on 404 (redirect /path → /path/ as fallback)
router.use(trailingSlash("append"));

// Redirects for renamed URLs (handled in middleware to avoid router conflicts)
const redirects: Record<string, string> = {
	"/guides/special-props-and-tags/": "/guides/special-props-and-components/",
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

	try {
		const staticDir = await self.directories.open("static");
		const fileHandle = await staticDir.getFileHandle(filename);
		const file = await fileHandle.getFile();
		const content = await file.arrayBuffer();
		const dotIndex = filename.lastIndexOf(".");
		const ext = dotIndex !== -1 ? filename.slice(dotIndex).toLowerCase() : "";
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
router.route("/pagefind/:path*").get(async (request, context) => {
	try {
		const pagefindDir = await self.directories.open("pagefind");
		const pathStr = context.params.path || "";
		const parts = pathStr.split("/").filter(Boolean);

		let currentDir = pagefindDir;
		for (let i = 0; i < parts.length - 1; i++) {
			currentDir = await currentDir.getDirectoryHandle(parts[i]);
		}

		const fileName = parts[parts.length - 1] || "";
		const fileHandle = await currentDir.getFileHandle(fileName);
		const file = await fileHandle.getFile();
		const content = await file.arrayBuffer();
		const dotIndex = fileName.lastIndexOf(".");
		const ext = dotIndex !== -1 ? fileName.slice(dotIndex).toLowerCase() : "";
		const contentType =
			ext === ".js"
				? "application/javascript"
				: ext === ".css"
					? "text/css"
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
	// Normalize URL to always include trailing slash, matching GitHub Pages
	if (!url.endsWith("/")) {
		url = url + "/";
	}

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

router.route("/blog/").get(async (request) => {
	const url = new URL(request.url);
	return renderView(BlogHomeView, url.pathname);
});

router.route("/blog/:slug/").get(async (request, context) => {
	const url = new URL(request.url);
	return renderView(BlogView, url.pathname, context.params);
});

router.route("/guides/:slug/").get(async (request, context) => {
	const url = new URL(request.url);
	return renderView(GuideView, url.pathname, context.params);
});

router.route("/api/").get(async (request) => {
	const url = new URL(request.url);
	return renderView(APIView, url.pathname);
});

router.route("/api/:module/").get(async (request, context) => {
	const url = new URL(request.url);
	return renderView(APIView, url.pathname, context.params);
});

router.route("/api/:module/:category/:slug/").get(async (request, context) => {
	const url = new URL(request.url);
	return renderView(APIView, url.pathname, context.params);
});

router.route("/playground/").get(async (request) => {
	const url = new URL(request.url);
	return renderView(PlaygroundView, url.pathname);
});

router.route("/press-kit/").get(async (request) => {
	const url = new URL(request.url);
	return renderView(PressKitView, url.pathname);
});

// Build and serve the Bikeshed spec on each request
router.route("/spec/").get(async () => {
	const outFile = `${import.meta.dirname}/../../docs/spec.html`;
	try {
		const proc = Bun.spawn(
			["bikeshed", "spec", "--die-on=nothing", "docs/spec.bs", outFile],
			{
				cwd: import.meta.dirname + "/../..",
				stdout: "pipe",
				stderr: "pipe",
			},
		);
		const exitCode = await proc.exited;
		if (exitCode !== 0) {
			const stderr = await new Response(proc.stderr).text();
			throw new Error(stderr || `bikeshed exited with code ${exitCode}`);
		}
		const html = await Bun.file(outFile).text();
		return new Response(html, {
			headers: {"Content-Type": "text/html"},
		});
	} catch (error: any) {
		const message =
			error?.code === "ENOENT"
				? "bikeshed is not installed. Run: pipx install bikeshed && bikeshed update"
				: (error?.message ?? "Unknown error building spec");
		return new Response(
			`<pre style="padding:2rem;font-family:monospace">${message}</pre>`,
			{status: 500, headers: {"Content-Type": "text/html"}},
		);
	}
});

// robots.txt
const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://crank.js.org/sitemap.xml
`;

router.route("/robots.txt").get(async () => {
	return new Response(robotsTxt, {
		headers: {"Content-Type": "text/plain"},
	});
});

// Sitemap (dev route; static build writes the file directly)
router.route("/sitemap.xml").get(async () => {
	const docsDir = await self.directories.open("docs");
	const blogDocs = await collectDocuments(
		await docsDir.getDirectoryHandle("blog"),
		"blog",
	);
	const guideDocs = await collectDocuments(
		await docsDir.getDirectoryHandle("guides"),
		"guides",
	);
	const apiDocs = await collectDocuments(
		await docsDir.getDirectoryHandle("api"),
		"api",
	);

	const urls = ["/", "/blog/", "/playground/", "/press-kit/", "/spec/"];
	for (const doc of [...blogDocs, ...guideDocs, ...apiDocs]) {
		urls.push(doc.url);
	}

	return new Response(generateSitemap(urls), {
		headers: {"Content-Type": "application/xml"},
	});
});

// RSS feed (dev route; static build writes the file directly)
router.route("/blog/feed.xml").get(async () => {
	const docsDir = await self.directories.open("docs");
	const blogDocs = await collectDocuments(
		await docsDir.getDirectoryHandle("blog"),
		"blog",
	);

	return new Response(generateFeed(blogDocs), {
		headers: {"Content-Type": "application/xml"},
	});
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

	const logger = self.loggers.get(["app", "crank-website"]);
	logger.info("Starting static site generation...");

	try {
		const staticBucket = await self.directories.open("public");

		// Static routes (with trailing slashes to match route patterns)
		const staticRoutes = [
			"/",
			"/blog/",
			"/playground/",
			"/press-kit/",
			"/spec/",
		];

		// Collect blog and guide documents
		const docsDir = await self.directories.open("docs");

		const blogDir = await docsDir.getDirectoryHandle("blog");
		const blogDocs = await collectDocuments(blogDir, "blog");
		staticRoutes.push(...blogDocs.map((doc) => doc.url));

		const guidesDir = await docsDir.getDirectoryHandle("guides");
		const guideDocs = await collectDocuments(guidesDir, "guides");
		staticRoutes.push(...guideDocs.map((doc) => doc.url));

		const apiDir = await docsDir.getDirectoryHandle("api");
		const apiDocs = await collectDocuments(apiDir, "api");
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
					// /blog/slug/ -> blog/slug/index.html
					const filePath =
						route === "/" ? "index.html" : `${route.slice(1)}index.html`;

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
		const staticSrcDir = await self.directories.open("static");
		for await (const [name, handle] of staticSrcDir.entries()) {
			if (handle.kind === "file") {
				try {
					const file = await (handle as FileSystemFileHandle).getFile();
					const content = await file.arrayBuffer();
					const destHandle = await staticFilesDir.getFileHandle(name, {
						create: true,
					});
					const writable = await destHandle.createWritable();
					await writable.write(content);
					await writable.close();
					logger.info(`Copied static/${name}`);
				} catch (error: any) {
					logger.error(`Failed to copy static/${name}:`, error.message);
				}
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

			const filePath = `${oldPath.replace(/^\/|\/$/g, "")}/index.html`;
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

		// Generate sitemap.xml
		const sitemapXML = generateSitemap(staticRoutes);
		const sitemapHandle = await staticBucket.getFileHandle("sitemap.xml", {
			create: true,
		});
		const sitemapWritable = await sitemapHandle.createWritable();
		await sitemapWritable.write(sitemapXML);
		await sitemapWritable.close();
		logger.info("Generated sitemap.xml");

		// Generate RSS feed
		const feedXML = generateFeed(blogDocs);
		const blogOutputDir = await staticBucket.getDirectoryHandle("blog", {
			create: true,
		});
		const feedHandle = await blogOutputDir.getFileHandle("feed.xml", {
			create: true,
		});
		const feedWritable = await feedHandle.createWritable();
		await feedWritable.write(feedXML);
		await feedWritable.close();
		logger.info("Generated blog/feed.xml");

		// Generate robots.txt
		const robotsHandle = await staticBucket.getFileHandle("robots.txt", {
			create: true,
		});
		const robotsWritable = await robotsHandle.createWritable();
		await robotsWritable.write(robotsTxt);
		await robotsWritable.close();
		logger.info("Generated robots.txt");

		logger.info("Static site generation complete!");
	} catch (error: any) {
		logger.error("Static site generation failed: {error}", {error});
	}
}

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function generateSitemap(urls: string[]): string {
	const entries = urls
		.map((url) => `  <url><loc>https://crank.js.org${url}</loc></url>`)
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

function generateFeed(blogDocs: Array<DocInfo>): string {
	const posts = [...blogDocs]
		.filter((doc) => doc.attributes.publish)
		.sort((a, b) => {
			const dateA = a.attributes.publishDate?.getTime() ?? 0;
			const dateB = b.attributes.publishDate?.getTime() ?? 0;
			return dateB - dateA;
		});

	const items = posts
		.map((post) => {
			const pubDate = post.attributes.publishDate
				? post.attributes.publishDate.toUTCString()
				: "";
			return `    <item>
      <title>${escapeXml(post.attributes.title)}</title>
      <link>https://crank.js.org${post.url}</link>
      <guid>https://crank.js.org${post.url}</guid>${pubDate ? `\n      <pubDate>${pubDate}</pubDate>` : ""}${post.attributes.description ? `\n      <description>${escapeXml(post.attributes.description)}</description>` : ""}${post.attributes.author ? `\n      <author>${escapeXml(post.attributes.author)}</author>` : ""}
    </item>`;
		})
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Crank.js Blog</title>
    <link>https://crank.js.org/blog/</link>
    <description>Articles about Crank.js, UI frameworks, and building for the web</description>
    <atom:link href="https://crank.js.org/blog/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}
