import {jsx} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom.js";

import Prism from "prismjs";
// TODO: lazily import these?
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-diff";
import "prismjs/components/prism-bash";
import {ContentAreaElement} from "@b9g/revise/contentarea.js";
import {InlineCodeBlock} from "./components/inline-code-block.js";

// @ts-ignore
Prism.manual = true;

if (!window.customElements.get("content-area")) {
	window.customElements.define("content-area", ContentAreaElement);
}

const gearInteractiveRoot = document.getElementById("gear-interactive");
import {GearInteractive} from "./components/gear-interactive.js";
if (gearInteractiveRoot) {
	renderer.render(jsx`<${GearInteractive} />`, gearInteractiveRoot);
}

// 1. Provides a root div element to render into
// 2. Renders components based on server/client environments.
// 3. Serializes props and makes them available on the client
// 4. Generates a script which calls renderer.render with the serialized props
// for every abstraction found.
// 5. If the abstraction is a component, we can render children normally as a
// server-side component, and then generate a client-side script to overwrite
// the component on the client.
const containers = document.querySelectorAll(".code-block-container");
for (const container of Array.from(containers)) {
	//console.log(container.outerHTML);
	const {code, lang} = (container as HTMLElement).dataset;
	renderer.render(
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
