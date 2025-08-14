import {jsx} from "@b9g/crank/standalone";
import {SerializeScript} from "./serialize-javascript.js";
import type {Storage} from "./esbuild";
import crankPackageJson from "@b9g/crank/package.json" with {type: "json"};

export async function StaticURLsJSON({storage}: {storage: Storage}) {
	// Dynamically generate URLs from the exports map in package.json
	const staticURLs: Record<string, string> = {};

	// Generate URLs for all Crank module exports
	for (const [exportPath, exportConfig] of Object.entries(
		crankPackageJson.exports,
	)) {
		// Skip non-JS exports (like package.json) and exports without ESM support
		if (exportPath === "./package.json") continue;
		if (
			typeof exportConfig === "object" &&
			exportConfig &&
			!("import" in exportConfig)
		)
			continue;

		// Convert export path to module specifier
		// "./" -> "@b9g/crank", "./async" -> "@b9g/crank/async", etc.
		const moduleSpecifier =
			exportPath === "./" ? "@b9g/crank" : `@b9g/crank${exportPath.slice(1)}`;

		try {
			const url = await storage.url(moduleSpecifier, "js", {format: "esm"});

			// Add both the base specifier and .js variant
			staticURLs[moduleSpecifier] = url;
			if (!moduleSpecifier.endsWith(".js")) {
				staticURLs[moduleSpecifier + ".js"] = url;
			}
		} catch (err) {
			console.warn(`Failed to generate URL for ${moduleSpecifier}:`, err);
		}
	}

	// Add CSS and other static assets
	const clientCSSURL = await storage.url("styles/client.css", "css");
	staticURLs["client.css"] = clientCSSURL;

	return jsx`
		<${SerializeScript} id="static-urls" name="static-urls" value=${staticURLs} />
	`;
}
