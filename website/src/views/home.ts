import {jsx} from "@b9g/crank";
import {Root} from "../components/root.js";
import type {Storage} from "../components/esbuild.js";

export default async function Home({storage}: {storage: Storage}) {
	return jsx`
		<${Root} title="Crank.js" url="/" storage=${storage}>
			<div id="gear-interactive" />
			<div style="margin: 0 auto">
				<header style="
					height: 100vh;
					display: flex;
					flex-direction: column;
					justify-content: space-around;
					align-items: center;
					text-align: center;
				">
					<h1>
						<span class="blur-background">The Just JavaScript Framework</span>
					</h1>
				</header>
				<div class="blur-background">
					<div class="feature">
						<h3>Declarative</h3>
						<p>
							Crank works with JSX syntax. If you don’t think JSX is “Just \
							JavaScript” enough, Crank provides a template tag that does \
							roughly the same.
						</p>
						<p>
							Crank ships with renderers that take JSX and produce HTML or \
							DOM nodes. You can even use the custom renderer API to write \
							your own.
						</p>
						<p>
							Components are functions.
						</p>
					</div>
				</div>
				<div class="feature-playground">
				</div>
			</div>
		<//Root>
	`;
}
