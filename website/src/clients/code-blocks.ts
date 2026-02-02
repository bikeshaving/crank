// Check early if there's work to do before loading heavy dependencies
const containers = document.querySelectorAll(".code-block-container");
const gearInteractiveRoot = document.getElementById("gear-interactive");

if (containers.length > 0 || gearInteractiveRoot) {
	// Lazy-load all heavy dependencies
	Promise.all([
		import("@b9g/crank/standalone"),
		import("@b9g/crank/dom"),
		import("@b9g/revise/contentarea.js"),
		import("../components/inline-code-block.js"),
		import("../components/serialize-javascript.js"),
		// Prism and components
		import("prismjs").then(async (Prism) => {
			window.Prism = window.Prism || {};
			Prism.default.manual = true;
			await Promise.all([
				import("prismjs/components/prism-javascript"),
				import("prismjs/components/prism-jsx"),
				import("prismjs/components/prism-typescript"),
				import("prismjs/components/prism-tsx"),
				import("prismjs/components/prism-diff"),
				import("prismjs/components/prism-bash"),
			]);
			return Prism;
		}),
	]).then(
		async ([
			{jsx},
			{renderer},
			{ContentAreaElement},
			{InlineCodeBlock},
			{extractData},
		]) => {
			if (!window.customElements.get("content-area")) {
				window.customElements.define("content-area", ContentAreaElement);
			}

			// Hydrate code blocks
			for (const container of Array.from(containers)) {
				const propsScript = container.querySelector(
					".props",
				) as HTMLScriptElement;
				const {code, lang, jsxVersion, templateVersion} =
					extractData(propsScript);
				renderer.hydrate(
					jsx`
					<${InlineCodeBlock}
						value=${code}
						lang=${lang}
						editable=${lang.endsWith(" live")}
						jsxVersion=${jsxVersion}
						templateVersion=${templateVersion}
					/>
				`,
					container,
				);
			}

			// Render gear interactive if present
			if (gearInteractiveRoot) {
				const {GearInteractive} =
					await import("../components/gear-interactive.js");
				renderer.render(jsx`<${GearInteractive} />`, gearInteractiveRoot);
			}
		},
	);
}
