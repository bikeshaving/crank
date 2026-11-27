import {createElement} from "@b9g/crank";
import type {Context} from "@b9g/crank";
import {label} from "./format.ts";

export function* Counter(this: Context) {
	let n = 0;
	const onclick = () => this.refresh(() => n++);

	for ({} of this) {
		yield (
			<button id="count" onclick={onclick}>
				{label(n)}
			</button>
		);
	}
}

export function App() {
	return (
		<main>
			<h1>App</h1>
			<input id="name" />
			<Counter />
		</main>
	);
}
