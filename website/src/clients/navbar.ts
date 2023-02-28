import {Navbar} from "../components/navbar.js";
import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/dom";

renderer.hydrate(
	jsx`<${Navbar} url=${new URL(window.location).pathname} />`,
	document.getElementById("navbar-root"),
);
