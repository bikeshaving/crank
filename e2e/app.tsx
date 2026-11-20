import {createElement} from "../src/crank.js";
import type {Children, Context} from "../src/crank.js";
import {Suspense} from "../src/async.js";

async function Slow({
	wait,
	children,
}: {
	wait: () => Promise<void>;
	children: Children;
}): Promise<Children> {
	await wait();
	return children;
}

function* Counter(this: Context): Generator<Children> {
	let count = 0;
	const onclick = () => this.refresh(() => count++);
	for ({} of this) {
		yield (
			<button id="count" onclick={onclick}>
				{count}
			</button>
		);
	}
}

// An app which is rendered on the server and hydrated in the browser. The
// slow part waits for wait() on both.
export function App({wait}: {wait: () => Promise<void>}): Children {
	return (
		<main>
			<h1>Shell</h1>
			<Suspense fallback={<p id="fallback">Loading</p>} timeout={0}>
				<Slow wait={wait}>
					<p id="slow">Slow</p>
					<Counter />
				</Slow>
			</Suspense>
			<footer>Footer</footer>
		</main>
	);
}
