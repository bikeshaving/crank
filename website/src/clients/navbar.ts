import {Navbar} from "../components/navbar.js";
const navbar = document.getElementById("navbar-root");

renderer.hydrate(
	jsx`<${Navbar} url=${new URL(window.location).pathname} />`,
	navbar,
);
