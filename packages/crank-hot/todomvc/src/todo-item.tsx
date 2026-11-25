import {createElement} from "@b9g/crank";
import type {Context} from "@b9g/crank";
import {TodoEvent} from "./events.ts";
import type {Todo} from "./events.ts";

export function* TodoItem(this: Context, {todo}: {todo: Todo}) {
	let editing = false;
	let editTitle = todo.title;
	const ontoggle = () => {
		this.dispatchEvent(
			new TodoEvent("todotoggle", {id: todo.id, completed: !todo.completed}),
		);
	};

	const ondelete = () => {
		this.dispatchEvent(new TodoEvent("tododelete", {id: todo.id}));
	};

	const onedit = () => {
		this.refresh(() => {
			editing = true;
			editTitle = todo.title;
		});
	};

	const onsave = () => {
		if (!editing) {
			return;
		}

		if (editTitle.trim()) {
			this.dispatchEvent(
				new TodoEvent("todoedit", {id: todo.id, title: editTitle.trim()}),
			);
		}

		this.refresh(() => (editing = false));
	};

	const oncancel = () => {
		this.refresh(() => {
			editing = false;
			editTitle = todo.title;
		});
	};

	const onkeydown = (ev: KeyboardEvent) => {
		if (ev.key === "Enter") {
			onsave();
		} else if (ev.key === "Escape") {
			oncancel();
		}
	};

	for ({todo} of this) {
		yield (
			<li class={{completed: todo.completed, editing}}>
				<div class="view">
					<input
						class="toggle"
						type="checkbox"
						checked={todo.completed}
						onchange={ontoggle}
					/>
					<label ondblclick={onedit}>{todo.title}</label>
					<button class="destroy" onclick={ondelete}></button>
				</div>
				{editing && (
					<input
						class="edit"
						type="text"
						value={editTitle}
						oninput={(ev: Event) =>
							(editTitle = (ev.target as HTMLInputElement).value)
						}
						onkeydown={onkeydown}
						onblur={onsave}
						autofocus
					/>
				)}
			</li>
		);
	}
}
