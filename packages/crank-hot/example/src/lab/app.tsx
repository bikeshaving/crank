import {createElement} from "@b9g/crank";
import type {Context} from "@b9g/crank";

// One component for each thing a page can lose when it is loaded again.

export function* Item(this: Context, {id}: {id: string}) {
	let done = false;
	const toggle = () => this.refresh(() => (done = !done));
	for ({id} of this) {
		yield (
			<li id={"item-" + id} class={done ? "done" : "open"}>
				<button class="toggle" onclick={toggle}>
					{id}
				</button>
				<input class="note" />
			</li>
		);
	}
}

export function* Todos(this: Context) {
	let order = ["a", "b", "c"];
	const reverse = () => this.refresh(() => (order = [...order].reverse()));
	for ({} of this) {
		yield (
			<section id="todos">
				<button id="reverse" onclick={reverse}>
					reverse
				</button>
				<ul>
					{order.map((id) => (
						<Item key={id} id={id} />
					))}
				</ul>
			</section>
		);
	}
}

export function Form() {
	return (
		<form id="form">
			<input id="check" type="checkbox" />
			<select id="pick">
				<option value="one">one</option>
				<option value="two">two</option>
			</select>
			<textarea id="area" />
			<p id="form-label">form</p>
		</form>
	);
}

export function* Clicks(this: Context) {
	let n = 0;
	this.addEventListener("click", () => this.refresh(() => n++));
	for ({} of this) {
		yield <button id="clicks">clicks {n}</button>;
	}
}

export function* Scroller(this: Context) {
	const lines = Array.from({length: 100}, (_, i) => i);
	for ({} of this) {
		yield (
			<div id="scroller" style="height: 100px; overflow: auto;">
				{lines.map((i) => (
					<div style="height: 20px;">line {i}</div>
				))}
			</div>
		);
	}
}

export async function* Feed(this: Context) {
	let n = 0;
	const onclick = () => this.refresh(() => n++);
	for await ({} of this) {
		yield (
			<button id="feed" onclick={onclick}>
				feed {n}
			</button>
		);
	}
}

export function* Probe(this: Context) {
	let n = 0;
	const onclick = () => this.refresh(() => n++);
	for ({} of this) {
		const shown = n * 2; // BREAK
		(window as any).probeStack = new Error("probe").stack; // TRACE
		yield (
			<button id="probe" onclick={onclick}>
				probe {shown}
			</button>
		);
	}
}

export function Lab() {
	return (
		<main>
			<Todos />
			<Form />
			<Clicks />
			<Scroller />
			<Feed />
			<Probe />
		</main>
	);
}
