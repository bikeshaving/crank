import {renderer} from "@b9g/crank/dom";

// Custom TodoMVC event that bubbles by default
class TodoEvent extends CustomEvent {
	constructor(type, detail = {}) {
		super(type, {
			bubbles: true,
			detail,
		});
	}
}

function* Header() {
	let title = "";

	const oninput = (ev) => {
		title = ev.target.value;
	};

	const onkeydown = (ev) => {
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

function* TodoItem({todo}) {
	let editing = false;
	let editTitle = todo.title;

	const ontoggle = () => {
		this.dispatchEvent(
			new TodoEvent("todotoggle", {
				id: todo.id,
				completed: !todo.completed,
			}),
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
		if (editTitle.trim()) {
			this.dispatchEvent(
				new TodoEvent("todoedit", {
					id: todo.id,
					title: editTitle.trim(),
				}),
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

	const onkeydown = (ev) => {
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
						oninput={(ev) => (editTitle = ev.target.value)}
						onkeydown={onkeydown}
						onblur={onsave}
						autofocus
					/>
				)}
			</li>
		);
	}
}

function* TodoList({todos, filter}) {
	for ({todos, filter} of this) {
		const filteredTodos = todos.filter((todo) => {
			if (filter === "active") return !todo.completed;
			if (filter === "completed") return todo.completed;
			return true;
		});

		yield (
			<ul class="todo-list">
				{filteredTodos.map((todo) => (
					<TodoItem key={todo.id} todo={todo} />
				))}
			</ul>
		);
	}
}

function* Footer({todos, filter}) {
	const setFilter = (newFilter) => {
		this.dispatchEvent(new TodoEvent("filterchange", {filter: newFilter}));
	};

	const clearCompleted = () => {
		this.dispatchEvent(new TodoEvent("todoclearcompleted"));
	};

	for ({todos, filter} of this) {
		const activeCount = todos.filter((t) => !t.completed).length;
		const completedCount = todos.filter((t) => t.completed).length;

		yield (
			<footer class="footer">
				<span class="todo-count">
					<strong>{activeCount}</strong> item{activeCount !== 1 ? "s" : ""} left
				</span>
				<ul class="filters">
					{["all", "active", "completed"].map((f) => (
						<li key={f}>
							<a
								href="javascript:void(0)"
								onclick={() => setFilter(f === "all" ? "" : f)}
								class={{selected: filter === (f === "all" ? "" : f)}}
							>
								{f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
							</a>
						</li>
					))}
				</ul>
				{completedCount > 0 && (
					<button class="clear-completed" onclick={clearCompleted}>
						Clear completed
					</button>
				)}
			</footer>
		);
	}
}

function* App() {
	let todos = [];
	let nextId = 1;
	let filter = "";

	this.addEventListener("todocreate", (ev) => {
		this.refresh(() => {
			todos.push({
				id: nextId++,
				title: ev.detail.title,
				completed: false,
			});
		});
	});

	this.addEventListener("todotoggle", (ev) => {
		this.refresh(() => {
			const todo = todos.find((t) => t.id === ev.detail.id);
			if (todo) todo.completed = ev.detail.completed;
		});
	});

	this.addEventListener("todoedit", (ev) => {
		this.refresh(() => {
			const todo = todos.find((t) => t.id === ev.detail.id);
			if (todo) todo.title = ev.detail.title;
		});
	});

	this.addEventListener("tododelete", (ev) => {
		this.refresh(() => {
			todos = todos.filter((t) => t.id !== ev.detail.id);
		});
	});

	this.addEventListener("todoclearcompleted", () => {
		this.refresh(() => {
			todos = todos.filter((t) => !t.completed);
		});
	});

	this.addEventListener("filterchange", (ev) => {
		this.refresh(() => {
			filter = ev.detail.filter;
		});
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
							checked={todos.every((t) => t.completed)}
							onchange={(e) => {
								const completed = e.target.checked;
								this.refresh(() => {
									todos.forEach((t) => (t.completed = completed));
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

// Add TodoMVC CSS
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "https://unpkg.com/todomvc-app-css@2.4.2/index.css";
// remove default stylesheet for playground
document.head.querySelector("link").remove();
document.head.appendChild(link);
await new Promise((resolve) => link.addEventListener("load", () => resolve(), {once: true}));

renderer.render(<App />, document.body);
