import {createElement} from "@b9g/crank";
import type {Todo} from "./events.ts";
import {TodoItem} from "./todo-item.tsx";

export function TodoList({
	todos,
	filter,
}: {
	todos: Array<Todo>;
	filter: string;
}) {
	const shown = todos.filter((todo) =>
		filter === "active"
			? !todo.completed
			: filter === "completed"
				? todo.completed
				: true,
	);

	return (
		<ul class="todo-list">
			{shown.map((todo) => (
				<TodoItem key={todo.id} todo={todo} />
			))}
		</ul>
	);
}
