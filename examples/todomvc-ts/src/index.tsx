/** @jsx createElement */
import {Context, createElement, Element, Fragment} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

interface Todo {
	id: number;
	title: string;
	completed: boolean;
}

type Filter = "" | "active" | "completed";

const ENTER_KEY = 13;
const ESC_KEY = 27;

function* Header(this: Context): Generator<Element> {
	let title = "";
	this.addEventListener("input", (ev) => {
		title = (ev.target as HTMLInputElement).value;
	});

	this.addEventListener("keydown", (ev) => {
		if (
			(ev.target as HTMLInputElement).tagName === "INPUT" &&
			ev.keyCode === ENTER_KEY
		) {
			if (title.trim()) {
				ev.preventDefault();
				const title1 = title.trim();
				title = "";
				this.dispatchEvent(
					new CustomEvent("todo.create", {
						bubbles: true,
						detail: {title: title1},
					}),
				);
			}
		}
	});

	while (true) {
		yield (
			<header class="header">
				<h1>todos</h1>
				<input
					class="new-todo"
					placeholder="What needs to be done?"
					autofocus
					value={title}
				/>
			</header>
		);
	}
}

function* TodoItem(this: Context, {todo}: {todo: Todo}): Generator<Element> {
	let active = false;
	let title = todo.title;
	this.addEventListener("click", (ev) => {
		if ((ev.target as HTMLButtonElement).className === "toggle") {
			this.dispatchEvent(
				new CustomEvent("todo.toggle", {
					bubbles: true,
					detail: {id: todo.id, completed: !todo.completed},
				}),
			);
		} else if ((ev.target as HTMLElement).className === "destroy") {
			this.dispatchEvent(
				new CustomEvent("todo.destroy", {
					bubbles: true,
					detail: {id: todo.id},
				}),
			);
		}
	});

	this.addEventListener("dblclick", (ev) => {
		if ((ev.target as HTMLElement).tagName === "LABEL") {
			active = true;
			this.refresh();
			(ev.target as any).parentElement!.nextSibling!.focus();
		}
	});

	this.addEventListener("input", (ev) => {
		if ((ev.target as HTMLInputElement).className === "edit") {
			title = (ev.target as HTMLInputElement).value;
		}
	});

	this.addEventListener("keydown", (ev) => {
		if (
			(ev.target as HTMLElement).className === "edit" &&
			(ev.keyCode === ENTER_KEY || ev.keyCode === ESC_KEY)
		) {
			active = false;
			title = title.trim();
			if (title) {
				this.dispatchEvent(
					new CustomEvent("todo.edit", {
						bubbles: true,
						detail: {id: todo.id, title},
					}),
				);
			} else {
				this.dispatchEvent(
					new CustomEvent("todo.destroy", {
						bubbles: true,
						detail: {id: todo.id},
					}),
				);
			}
		}
	});

	this.addEventListener(
		"blur",
		(ev) => {
			if ((ev.target as HTMLElement).className === "edit") {
				active = false;
				if (title) {
					this.dispatchEvent(
						new CustomEvent("todo.edit", {
							bubbles: true,
							detail: {id: todo.id, title},
						}),
					);
				} else {
					this.dispatchEvent(
						new CustomEvent("todo.destroy", {
							bubbles: true,
							detail: {id: todo.id},
						}),
					);
				}
			}
		},
		{capture: true},
	);

	for ({todo} of this) {
		const classes = [];
		if (active) {
			classes.push("editing");
		}
		if (todo.completed) {
			classes.push("completed");
		}

		yield (
			<li class={classes.join(" ")}>
				<div class="view">
					<input class="toggle" type="checkbox" checked={todo.completed} />
					<label>{todo.title}</label>
					<button class="destroy" />
				</div>
				<input class="edit" value={title} />
			</li>
		);
	}
}

function Main(
	this: Context,
	{todos, filter}: {todos: Todo[]; filter: Filter},
): Element {
	const completed = todos.every((todo) => todo.completed);
	this.addEventListener("click", (ev) => {
		if ((ev.target as HTMLElement).className === "toggle-all") {
			this.dispatchEvent(
				new CustomEvent("todo.toggleAll", {
					bubbles: true,
					detail: {completed: !completed},
				}),
			);
		}
	});

	if (filter === "active") {
		todos = todos.filter((todo) => !todo.completed);
	} else if (filter === "completed") {
		todos = todos.filter((todo) => todo.completed);
	}

	return (
		<section class="main">
			<input
				id="toggle-all"
				class="toggle-all"
				type="checkbox"
				checked={completed}
			/>
			<label for="toggle-all">Mark all as complete</label>
			<ul class="todo-list">
				{todos.map((todo) => (
					<TodoItem todo={todo} crank-key={todo.id} />
				))}
			</ul>
		</section>
	);
}

function Filters(this: Context, {filter}: {filter: Filter}): Element {
	return (
		<ul class="filters">
			<li>
				<a class={filter === "" ? "selected" : ""} href="#/">
					All
				</a>
			</li>
			<li>
				<a class={filter === "active" ? "selected" : ""} href="#/active">
					Active
				</a>
			</li>
			<li>
				<a class={filter === "completed" ? "selected" : ""} href="#/completed">
					Completed
				</a>
			</li>
		</ul>
	);
}

function Footer(
	this: Context,
	{todos, filter}: {todos: Todo[]; filter: Filter},
): Element {
	const completed = todos.filter((todo) => todo.completed).length;
	const remaining = todos.length - completed;
	this.addEventListener("click", (ev) => {
		if ((ev.target as HTMLElement).className === "clear-completed") {
			this.dispatchEvent(new Event("todo.clearCompleted", {bubbles: true}));
		}
	});

	return (
		<footer class="footer">
			<span class="todo-count">
				<strong>{remaining}</strong> {remaining === 1 ? "item" : "items"} left
			</span>
			<Filters filter={filter} />
			{!!completed && <button class="clear-completed">Clear completed</button>}
		</footer>
	);
}

const STORAGE_KEY = "todos-crank";
function save(todos: Array<Todo>) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

declare module "@bikeshaving/crank" {
	interface EventMap {
		"todo.create": CustomEvent<Todo>;
		"todo.edit": CustomEvent<Todo>;
		"todo.toggle": CustomEvent<Todo>;
		"todo.toggleAll": CustomEvent<{completed: boolean}>;
		"todo.destroy": CustomEvent<Todo>;
	}
}

function* App(this: Context): Generator<Element> {
	let todos: Array<Todo> = [];
	let nextTodoId = 0;
	try {
		const storedTodos = JSON.parse(localStorage.getItem(STORAGE_KEY) || "");
		if (Array.isArray(storedTodos) && storedTodos.length) {
			todos = storedTodos;
			nextTodoId = Math.max(...storedTodos.map((todo) => todo.id)) + 1;
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}
	} catch (err) {
		localStorage.removeItem(STORAGE_KEY);
	}

	let filter: Filter = "";
	this.addEventListener("todo.create", (ev) => {
		todos.push({id: nextTodoId++, title: ev.detail.title, completed: false});
		this.refresh();
		save(todos);
	});

	this.addEventListener("todo.edit", (ev) => {
		const i = todos.findIndex((todo) => todo.id === ev.detail.id);
		todos[i].title = ev.detail.title;
		this.refresh();
		save(todos);
	});

	this.addEventListener("todo.toggle", (ev) => {
		const i = todos.findIndex((todo) => todo.id === ev.detail.id);
		todos[i].completed = ev.detail.completed;
		this.refresh();
		save(todos);
	});

	this.addEventListener("todo.toggleAll", (ev) => {
		todos = todos.map((todo) => ({...todo, completed: ev.detail.completed}));
		this.refresh();
		save(todos);
	});

	this.addEventListener("todo.clearCompleted", () => {
		todos = todos.filter((todo) => !todo.completed);
		this.refresh();
		save(todos);
	});

	this.addEventListener("todo.destroy", (ev) => {
		todos = todos.filter((todo) => todo.id !== ev.detail.id);
		this.refresh();
		save(todos);
	});

	const route = (ev?: HashChangeEvent) => {
		switch (window.location.hash) {
			case "#/active": {
				filter = "active";
				break;
			}
			case "#/completed": {
				filter = "completed";
				break;
			}
			case "#/": {
				filter = "";
				break;
			}
			default: {
				filter = "";
				window.location.hash = "#/";
			}
		}

		if (ev != null) {
			this.refresh();
		}
	};

	route();
	window.addEventListener("hashchange", route);
	try {
		while (true) {
			yield (
				<Fragment>
					<Header />
					{!!todos.length && <Main todos={todos} filter={filter} />}
					{!!todos.length && <Footer todos={todos} filter={filter} />}
				</Fragment>
			);
		}
	} finally {
		window.removeEventListener("hashchange", route);
	}
}

renderer.render(<App />, document.getElementsByClassName("todoapp")[0]);
