export interface Todo {
	id: number;
	title: string;
	completed: boolean;
}

/** What a component tells the app, which bubbles to it. */
export class TodoEvent extends CustomEvent<any> {
	constructor(type: string, detail: Record<string, unknown> = {}) {
		super(type, {bubbles: true, detail});
	}
}
