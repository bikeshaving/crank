import {xm} from "@b9g/crank";
import {Root} from "../components/root.js";
//import {Marked} from "../components/marked.js";
//import {components} from "../components/marked-components.js";
import type {Storage} from "../components/esbuild.js";

const __dirname = new URL(".", import.meta.url).pathname;

export default async function Index({storage}: {storage: Storage}) {
	//const markdown = await fs.readFile(
	//	path.join(__dirname, "../../documents/index.md"),
	//	{encoding: "utf8"},
	//);
	return xm`
		<${Root} title="Crank.js" url="/" storage=${storage}>
			<div class="home">
				<header class="hero">
					<h1>Crank.js</h1>
					<h2>The “Just JavaScript” web framework.</h2>
				</header>
			</div>
		<//Root>
	`;
}