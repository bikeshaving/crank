import {t} from "@b9g/crank/template.js";
import {Root} from "./root.ts";

export default async function Home() {
	const examples = await fs.readFile(
		path.join(rootDirname, "../documents/index.md"),
		{encoding: "utf8"},
	);
	const Content = createComponent(examples);

	return t`
		<${Root} title="Crank.js" url="/">
			<div class="home">
				<header class="hero">
					<h1>Crank.js</h1>
					<h2>The “Just JavaScript” web framework.</h2>
				</header>
				<${Content} components=${components} />
			</div>
		<//Root>
	`;
}
