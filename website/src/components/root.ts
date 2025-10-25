import Path from "path";
import {jsx, Raw} from "@b9g/crank/standalone";
import type {Children, Context} from "@b9g/crank";
import {extractCritical} from "@emotion/server";
import {Page, Link, Script, Storage} from "./esbuild.js";
import {Navbar} from "./navbar.js";
import {StaticURLsJSON} from "./static-urls-json.js";
import {getColorSchemeScript} from "../utils/color-scheme.js";

function ColorSchemeScript() {
	// This script must be executed as early as possible to prevent a FOUC.
	// It also cannot be `type="module"` because that will also cause an FOUC.
	const scriptText = `(() => { ${getColorSchemeScript()} })()`;
	return jsx`
		<script>
			<${Raw} value=${scriptText} />
		</script>
	`;
}

export function* Root(
	this: Context,
	{
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
	},
) {
	for ({title, children, url, storage, description = ""} of this) {
		this.schedule(() => this.refresh());
		const childrenHTML: string = yield jsx`
			<${Page} storage=${storage}>
				<div id="navbar-root">
					<${Navbar} url=${url} />
				</div>
				${children}
			<//Page>
		`;
		const {html, css} = extractCritical(childrenHTML);
		yield jsx`
			<${Raw} value="<!DOCTYPE html>" />
			<${Page} storage=${storage}>
				<html lang="en">
					<head>
						<meta charset="UTF-8" />
						<meta name="viewport" content="width=device-width" />
						<title>${title}</title>
						<link rel="shortcut icon" href="/static/favicon.ico" />
						<style>${css}</style>
						<${Link} rel="stylesheet" type="text/css" href="styles/client.css" />
						<meta name="description" content=${description} />
						<meta property="og:title" content=${title} />
						<meta property="og:url" content=${Path.join("https://crank.js.org", url)} />
						<meta property="og:description" content=${description} />
						<meta property="og:type" content="website" />
						<meta property="og:site_name" content="Crank.js" />
						<meta property="og:image" content="https://crank.js.org/static/logo.svg" />
						<meta name="twitter:card" content="summary" />
						<meta name="twitter:title" content=${title} />
						<meta name="twitter:description" content=${description} />
						<meta name="twitter:image" content="https://crank.js.org/static/logo.svg" />
					</head>
					<body>
						<${ColorSchemeScript} />
						<${Raw} value=${html} />
						<${StaticURLsJSON} id="static-urls" storage=${storage} />
						<${Script} src="clients/navbar.ts" />
						<${Script} src="clients/code-blocks.ts" />
					</body>
				</html>
			<//Page>
		`;
	}
}
