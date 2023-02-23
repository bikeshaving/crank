import {jsx, Raw} from "@b9g/crank/standalone";
import type {Children} from "@b9g/crank";
import {Page, Link, Script, Storage} from "../components/esbuild.js";
import {Navbar} from "../components/navbar.js";
import {GoogleSpyware} from "../components/google-spyware.js";

function ColorSchemeScript() {
	// This script must be executed as early as possible to prevent a FOUC.
	// It also cannot be `type="module"` because that will also cause an FOUC.
	const scriptText = `
	(() => {
		const colorScheme = sessionStorage.getItem("color-scheme") ||
			(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark" : "light"
			);
		if (colorScheme === "dark") {
			document.body.classList.remove("color-scheme-light");
		} else {
			document.body.classList.add("color-scheme-light");
		}
	})()`;
	return jsx`
		<script>
			<${Raw} value=${scriptText} />
		</script>
	`;
}

async function StaticURLsJSON({storage}: {storage: Storage}) {
	const clientCSSURL = await storage.url("styles/client.css", "css");
	// TODO: figure out a smarter way to do this
	// TODO: versioned modules
	const crankURL = await storage.url("lib/crank.js", "js");
	const crankDOMURL = await storage.url("lib/dom.js", "js");
	const crankHTMLURL = await storage.url("lib/html.js", "js");
	const crankJSXTagURL = await storage.url("lib/jsx-tag.js", "js");
	const crankJSXRuntimeURL = await storage.url("lib/jsx-runtime.js", "js");
	const crankStandaloneURL = await storage.url("lib/standalone.js", "js");
	const staticURLs = {
		"client.css": clientCSSURL,
		"@b9g/crank": crankURL,
		"@b9g/crank/crank": crankURL,
		"@b9g/crank/crank.js": crankURL,
		"@b9g/crank/dom": crankDOMURL,
		"@b9g/crank/dom.js": crankDOMURL,
		"@b9g/crank/html": crankHTMLURL,
		"@b9g/crank/html.js": crankHTMLURL,
		"@b9g/crank/jsx-tag": crankJSXTagURL,
		"@b9g/crank/jsx-tag.js": crankJSXTagURL,
		"@b9g/crank/jsx-runtime": crankJSXRuntimeURL,
		"@b9g/crank/jsx-runtime.js": crankJSXRuntimeURL,
		"@b9g/crank/standalone": crankStandaloneURL,
		"@b9g/crank/standalone.js": crankStandaloneURL,
	};

	return jsx`
		<script id="static-urls" type="application/json">
			<${Raw} value=${JSON.stringify(staticURLs)} />
		</script>
	`;
}

export function Root({
	title, children, url, storage,
}: {
	title: string;
	children: Children;
	url: string;
	storage: Storage;
}) {
	return jsx`
		<${Raw} value="<!DOCTYPE html>" />
		<${Page} storage=${storage}>
			<html lang="en">
				<head>
					<meta charset="UTF-8" />
					<meta name="viewport" content="width=device-width" />
					<title>${title}</title>
					<${Link} rel="stylesheet" type="text/css" href="styles/client.css" />
					<link rel="shortcut icon" href="/static/favicon.ico" />
					<!--
					<${GoogleSpyware} />
					-->
				</head>
				<body>
					<${ColorSchemeScript} />
					<div id="navbar-root">
						<${Navbar} url=${url} />
					</div>
					<>${children}</>
					<${StaticURLsJSON} storage=${storage} />
					<${Script} src="client.ts" />
				</body>
			</html>
		<//Page>
	`;
}
