import {createElement} from "@b9g/crank";
import type {Context} from "@b9g/crank";
import {TodoEvent} from "./events.ts";
import type {Todo} from "./events.ts";

const FILTERS = [
	{name: "All", value: ""},
	{name: "Active", value: "active"},
	{name: "Completed", value: "completed"},
];

export function Footer(
	this: Context,
	{todos, filter}: {todos: Array<Todo>; filter: string},
) {
	const activeCount = todos.filter((todo) => !todo.completed).length;
	const completedCount = todos.length - activeCount;
	return (
		<footer class="footer">
			<span class="todo-count">
				<strong>{activeCount}</strong> item{activeCount !== 1 ? "s" : ""} left
			</span>
			<ul class="filters">
				{FILTERS.map(({name, value}) => (
					<li key={value}>
						<a
							href="javascript:void(0)"
							class={{selected: filter === value}}
							onclick={() =>
								this.dispatchEvent(
									new TodoEvent("filterchange", {filter: value}),
								)
							}
						>
							{name}
						</a>
					</li>
				))}
			</ul>
			{completedCount > 0 && (
				<button
					class="clear-completed"
					onclick={() =>
						this.dispatchEvent(new TodoEvent("todoclearcompleted"))
					}
				>
					Clear completed
				</button>
			)}
		</footer>
	);
}
