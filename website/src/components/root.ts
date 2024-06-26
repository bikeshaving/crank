import Path from "path";
import {jsx, Raw} from "@b9g/crank/standalone";
import type {Children} from "@b9g/crank";
import {Page, Link, Script, Storage} from "./esbuild.js";
import {Navbar} from "./navbar.js";
import {StaticURLsJSON} from "./static-urls-json.js";

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

export function Root({
	title,
	children,
	url,
	storage,
	description = "",
}: {
	title: string;
	children: Children;
	url: string;
	storage: Storage;
	description?: string;
}) {
	return jsx`
		<${Raw} value="<!DOCTYPE html>" />
		<${Page} storage=${storage}>
			<html lang="en">
				<head>
					<meta charset="UTF-8" />
					<meta name="viewport" content="width=device-width" />
					<title>${title}</title>
					<!-- TODO: Update favicon.
					<link rel="shortcut icon" href="/static/favicon.ico" />
					-->
					<${Link} rel="stylesheet" type="text/css" href="styles/client.css" />
					<meta property="og:title" content=${title} />
					<meta property="og:url" content=${Path.join("https://crank.js.org", url)} />
					<meta property="og:description" content=${description} />
				</head>
				<body>
					<${ColorSchemeScript} />
					<div id="navbar-root">
						<${Navbar} url=${url} />
					</div>
					<>${children}</>
					<${StaticURLsJSON} id="static-urls" storage=${storage} />
					<${Script} src="clients/navbar.ts" />
					<${Script} src="clients/code-blocks.ts" />
				</body>
			</html>
		<//Page>
	`;
}
