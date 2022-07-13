import {xm} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
import {PrismEditor} from "./components/prism.js";

import "prismjs/components/prism-javascript";
const el = document.getElementById("playground");
renderer.render(
	xm`
	<div style="position: relative; top: 100px; border: 1px dotted green">
		<${PrismEditor} value="console.log(\"Hello?\")" language="js" />
	</div>
`,
	el,
);
