import {createElement} from "@b9g/crank";
import type {Context} from "@b9g/crank";
import {TodoEvent} from "./events.ts";

export function* Header(this: Context) {
	let title = "";
	const oninput = (ev: Event) => {
		title = (ev.target as HTMLInputElement).value;
	};

	const onkeydown = (ev: KeyboardEvent) => {
		if (ev.key === "Enter" && title.trim()) {
			ev.preventDefault();
			this.dispatchEvent(new TodoEvent("todocreate", {title: title.trim()}));
			this.refresh(() => (title = ""));
		}
	};

	for ({} of this) {
		yield (
			<header class="header">
				<h1>todos</h1>
				<input
					class="new-todo"
					placeholder="What needs to be done?"
					value={title}
					oninput={oninput}
					onkeydown={onkeydown}
					autofocus
				/>
			</header>
		);
	}
}
