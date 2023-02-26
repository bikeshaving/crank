import {jsx} from "@b9g/crank/standalone";
import {EmbeddedJSON} from "./embedded-json.js";
import type {Storage} from "./esbuild";

export async function StaticURLsJSON({storage}: {storage: Storage}) {
	// NOTE: This is how we get crank served locally.
	// TODO: Figure out a smarter way to do this.
	// TODO: Versioned modules.
	const crankURL = await storage.url("lib/crank.js", "js");
	const crankDOMURL = await storage.url("lib/dom.js", "js");
	const crankHTMLURL = await storage.url("lib/html.js", "js");
	const crankJSXTagURL = await storage.url("lib/jsx-tag.js", "js");
	const crankJSXRuntimeURL = await storage.url("lib/jsx-runtime.js", "js");
	const crankStandaloneURL = await storage.url("lib/standalone.js", "js");
	// TODO: Calling this first causes ESBuild to hang. Scary stuff.
	const clientCSSURL = await storage.url("styles/client.css", "css");
	const staticURLs = {
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
		"client.css": clientCSSURL,
	};

	return jsx`
		<${EmbeddedJSON} name="static-urls" value=${staticURLs} />
	`;
}
