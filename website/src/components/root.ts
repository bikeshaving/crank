import Path from "path";
import {jsx, Raw} from "@b9g/crank/standalone";
import type {Children, Context} from "@b9g/crank";
import {extractCritical} from "@emotion/server";
import {Navbar} from "./navbar.js";
import {SerializeScript} from "./serialize-javascript.js";
import {getColorSchemeScript} from "../utils/color-scheme.js";
import {assets, staticURLs} from "../server.js";

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
		description = "",
	}: {
		title: string;
		children: Children;
		url: string;
		description?: string;
	},
) {
	for ({title, children, url, description = ""} of this) {
		this.schedule(() => this.refresh());
		const childrenHTML: string = yield jsx`
			<div id="navbar-root">
				<${Navbar} url=${url} />
			</div>
			${children}
		`;
		const {html, css} = extractCritical(childrenHTML);
		yield jsx`
			<${Raw} value="<!DOCTYPE html>" />
			<html lang="en">
				<head>
					<meta charset="UTF-8" />
					<meta name="viewport" content="width=device-width" />
					<title>${title}</title>
					<link rel="shortcut icon" href=${assets.favicon} />
					<style>${css}</style>
					<link rel="stylesheet" type="text/css" href=${assets.clientCSS} />
					<meta name="description" content=${description} />
					<meta property="og:title" content=${title} />
					<meta property="og:url" content=${Path.join("https://crank.js.org", url)} />
					<meta property="og:description" content=${description} />
					<meta property="og:type" content="website" />
					<meta property="og:site_name" content="Crank.js" />
					<meta property="og:image" content=${assets.logo} />
					<meta name="twitter:card" content="summary" />
					<meta name="twitter:title" content=${title} />
					<meta name="twitter:description" content=${description} />
					<meta name="twitter:image" content=${assets.logo} />
				</head>
				<body>
					<${ColorSchemeScript} />
					<${Raw} value=${html} />
					<${SerializeScript} id="static-urls" value=${staticURLs} />
					<script type="module" src=${assets.navbarScript}></script>
					<script type="module" src=${assets.codeBlocksScript}></script>
				</body>
			</html>
		`;
	}
}
