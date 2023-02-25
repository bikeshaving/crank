import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/dom";

import Prism from "prismjs";
// TODO: lazily import these?
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-diff";
import "prismjs/components/prism-bash";
import {ContentAreaElement} from "@b9g/revise/contentarea.js";
import {InlineCodeBlock} from "../components/inline-code-block.js";
import {escapedScript} from "../components/embedded-json.js";
import {GearInteractive} from "../components/gear-interactive.js";
import {Navbar} from "../components/navbar.js";

// @ts-ignore
Prism.manual = true;

if (!window.customElements.get("content-area")) {
	window.customElements.define("content-area", ContentAreaElement);
}

const gearInteractiveRoot = document.getElementById("gear-interactive");
if (gearInteractiveRoot) {
	renderer.hydrate(jsx`<${GearInteractive} />`, gearInteractiveRoot);
}

// TODO: abstract this pattern as an Island component
const containers = document.querySelectorAll(".code-block-container");
for (const container of Array.from(containers)) {
	const propsScript = container.querySelector(".props");
	const json = propsScript.textContent.replace(
		new RegExp(escapedScript, "g"),
		"</script>",
	);
	const {code, lang} = JSON.parse(json);
	renderer.hydrate(
		jsx`
			<${InlineCodeBlock}
				value=${code}
				lang=${lang}
				editable=${lang.endsWith(" live")}
			/>
		`,
		container,
	);
}

const navbar = document.getElementById("navbar-root");

renderer.hydrate(
	jsx`<${Navbar} url=${new URL(window.location).pathname} />`,
	navbar,
);
