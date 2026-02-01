import {Search} from "../components/search.js";
import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/dom";

const searchRoot = document.getElementById("search-root");
if (searchRoot) {
	renderer.hydrate(jsx`<${Search} />`, searchRoot);
}
