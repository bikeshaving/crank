/** @jsxImportSource @b9g/crank */
import type {Context} from "@b9g/crank";

export function* Counter(this: Context) {
	let count = 0;

	for ({} of this) {
		yield (
			<div>
				<span>Count: {count}</span>{" "}
				<button onclick={() => this.refresh(() => count++)}>Increment</button>
			</div>
		);
	}
}
