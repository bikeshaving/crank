import {jsx, Raw} from "@b9g/crank/standalone";
import type {Children} from "@b9g/crank";
import {Page, Link, Script, Storage} from "./esbuild.js";
import {Navbar} from "./navbar.js";
import {GoogleSpyware} from "./google-spyware.js";
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
					<${Script} src="clients/code-blocks.ts" />
				</body>
			</html>
		<//Page>
	`;
}
