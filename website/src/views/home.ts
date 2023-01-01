import {jsx} from "@b9g/crank";
import {Root} from "../components/root.js";
import type {Storage} from "../components/esbuild.js";
import {collectDocuments} from "../models/document.js";
import * as Path from "path";

import {Marked} from "../components/marked.js";
import {components} from "../components/marked-components.js";
const __dirname = new URL(".", import.meta.url).pathname;
export default async function Home({storage}: {storage: Storage}) {
	const docs = await collectDocuments(Path.join(__dirname, "../../documents"));

	const index = docs.find((doc) => doc.filename.endsWith("/index.md"));
	if (!index) {
		throw new Error("index.md missing you silly goose");
	}

	return jsx`
		<${Root} title="Crank.js" url="/" storage=${storage}>
			<div id="gear-interactive" />
			<div style="margin: 0 auto">
				<header style="
					height: 50vh;
					display: flex;
					flex-direction: column;
					justify-content: flex-end;
					align-items: center;
					text-align: center;
				">
					<h1 class="blur-background">
						Crank.js
					</h1>
					<h2 class="blur-background">
						The Just JavaScript Framework
					</h2>
				</header>
				<div class="blur-background">
					<div style="width: 800px; margin: 0 auto; padding: 30px; font-size: 1.2rem">
						<${Marked} markdown=${index.body} components=${components} />
					</div>
				</div>
			</div>
		<//Root>
	`;
}
