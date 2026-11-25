import {createElement} from "@b9g/crank";
import type {Context} from "@b9g/crank";
import type {Todo} from "./events.ts";
import {Footer} from "./footer.tsx";
import {Header} from "./header.tsx";
import {TodoList} from "./todo-list.tsx";

export function* App(this: Context) {
	let todos: Array<Todo> = [];
	let nextId = 1;
	let filter = "";
	this.addEventListener("todocreate", (ev: any) => {
		this.refresh(() => {
			todos.push({id: nextId++, title: ev.detail.title, completed: false});
		});
	});

	this.addEventListener("todotoggle", (ev: any) => {
		this.refresh(() => {
			const todo = todos.find((todo) => todo.id === ev.detail.id);
			if (todo) {
				todo.completed = ev.detail.completed;
			}
		});
	});

	this.addEventListener("todoedit", (ev: any) => {
		this.refresh(() => {
			const todo = todos.find((todo) => todo.id === ev.detail.id);
			if (todo) {
				todo.title = ev.detail.title;
			}
		});
	});

	this.addEventListener("tododelete", (ev: any) => {
		this.refresh(() => {
			todos = todos.filter((todo) => todo.id !== ev.detail.id);
		});
	});

	this.addEventListener("todoclearcompleted", () => {
		this.refresh(() => {
			todos = todos.filter((todo) => !todo.completed);
		});
	});

	this.addEventListener("filterchange", (ev: any) => {
		this.refresh(() => (filter = ev.detail.filter));
	});

	for ({} of this) {
		yield (
			<section class="todoapp">
				<Header />
				{todos.length > 0 && (
					<section class="main">
						<input
							id="toggle-all"
							class="toggle-all"
							type="checkbox"
							checked={todos.every((todo) => todo.completed)}
							onchange={(ev: Event) => {
								const completed = (ev.target as HTMLInputElement).checked;
								this.refresh(() => {
									for (const todo of todos) {
										todo.completed = completed;
									}
								});
							}}
						/>
						<label for="toggle-all">Mark all as complete</label>
						<TodoList todos={todos} filter={filter} />
						<Footer todos={todos} filter={filter} />
					</section>
				)}
			</section>
		);
	}
}
