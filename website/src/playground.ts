import {xm} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
import {PrismEditor} from "./components/prism-editor.js";
import "prismjs/components/prism-javascript";

import {ContentAreaElement} from "@b9g/revise/contentarea.js";
if (!window.customElements.get("content-area")) {
	window.customElements.define("content-area", ContentAreaElement);
}

const el = document.getElementById("playground");

renderer.render(
	xm`
		<div style="position: relative; top: 100px">
			<${PrismEditor}
				value="hello\n\nworld\n"
				language="typescript"
			/>
		</div>
	`,
	el!,
);
