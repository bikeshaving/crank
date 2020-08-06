/** @jsx createElement */
import {Context, createElement, Element, Fragment} from "../index";
import {renderer} from "../dom";

describe("events", () => {
	test("function component", () => {
		const mock = jest.fn();
		function Button(this: Context) {
			this.addEventListener("click", () => {
				mock();
			});
			return <button>Click me</button>;
		}

		renderer.render(<Button />, document.body);
		const button = document.body.firstChild as HTMLButtonElement;
		button.click()!;
		button.click()!;
		button.click()!;
		expect(mock).toHaveBeenCalledTimes(3);
		renderer.render(<Button />, document.body);
		renderer.render(<Button />, document.body);
		renderer.render(<Button />, document.body);
		renderer.render(<Button />, document.body);
		renderer.render(<Button />, document.body);
		expect(mock).toHaveBeenCalledTimes(3);
		expect(document.body.firstChild).toBe(button);
		button.click();
		button.click();
		button.click();
		expect(mock).toHaveBeenCalledTimes(6);
		renderer.render(null, document.body);
		button.click();
		button.click();
		button.click();
		expect(mock).toHaveBeenCalledTimes(6);
	});

	test("delegation", () => {
		let ctx!: Context;
		function* Component(this: Context): Generator<Element> {
			ctx = this;
			while (true) {
				yield (
					<div>
						<button>Click me</button>
					</div>
				);
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual(
			"<div><button>Click me</button></div>",
		);
		const div = document.body.firstChild!;
		const button = div.firstChild!;
		const divAddEventListener = jest.spyOn(div, "addEventListener");
		const divRemoveEventListener = jest.spyOn(div, "removeEventListener");
		const buttonAddEventListener = jest.spyOn(button, "addEventListener");
		const buttonRemoveEventListener = jest.spyOn(button, "removeEventListener");
		const listener = jest.fn();
		ctx.addEventListener("click", listener);
		expect(divAddEventListener).toHaveBeenCalledTimes(1);
		expect(divAddEventListener).toHaveBeenCalledWith("click", listener, {});
		expect(buttonAddEventListener).toHaveBeenCalledTimes(0);
		expect(divRemoveEventListener).toHaveBeenCalledTimes(0);
		expect(buttonRemoveEventListener).toHaveBeenCalledTimes(0);
		renderer.render(null, document.body);
		expect(divRemoveEventListener).toHaveBeenCalledTimes(1);
		expect(divRemoveEventListener).toHaveBeenCalledWith("click", listener, {});
		expect(buttonRemoveEventListener).toHaveBeenCalledTimes(0);
	});

	test("delegation with unmounting children", () => {
		let ctx!: Context;
		function* Component(this: Context): Generator<Element> {
			ctx = this;
			yield (
				<div>
					<button>Click me</button>
				</div>
			);
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual(
			"<div><button>Click me</button></div>",
		);
		const div = document.body.firstChild!;
		const button = div.firstChild!;
		const divAddEventListener = jest.spyOn(div, "addEventListener");
		const divRemoveEventListener = jest.spyOn(div, "removeEventListener");
		const buttonAddEventListener = jest.spyOn(button, "addEventListener");
		const buttonRemoveEventListener = jest.spyOn(button, "removeEventListener");
		const listener = jest.fn();
		ctx.addEventListener("click", listener);
		expect(divAddEventListener).toHaveBeenCalledTimes(1);
		expect(divAddEventListener).toHaveBeenCalledWith("click", listener, {});
		expect(buttonAddEventListener).toHaveBeenCalledTimes(0);
		expect(divRemoveEventListener).toHaveBeenCalledTimes(0);
		expect(buttonRemoveEventListener).toHaveBeenCalledTimes(0);
		ctx.refresh();
		expect(document.body.innerHTML).toEqual("");
		expect(divRemoveEventListener).toHaveBeenCalledTimes(1);
		expect(divRemoveEventListener).toHaveBeenCalledWith("click", listener, {});
		expect(buttonRemoveEventListener).toHaveBeenCalledTimes(0);
	});

	test("non-direct delegation", () => {
		function Child({depth}: {depth: number}) {
			if (depth <= 0) {
				return (
					<Fragment>
						<Fragment>
							<button>Click me</button>
						</Fragment>
					</Fragment>
				);
			}

			return <Child depth={depth - 1} />;
		}

		const mock = jest.fn();
		function* Parent(this: Context) {
			this.addEventListener("click", () => {
				mock();
			});
			while (true) {
				yield (
					<Fragment>
						<Fragment>
							<Child depth={10} />
						</Fragment>
					</Fragment>
				);
			}
		}

		renderer.render(
			<div>
				<Parent />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><button>Click me</button></div>",
		);
		const button = document.body.firstChild!.firstChild as HTMLButtonElement;
		button.click();
		button.click();
		button.click();
		expect(mock).toHaveBeenCalledTimes(3);
		renderer.render(null, document.body);
		button.click();
		button.click();
		button.click();
		expect(mock).toHaveBeenCalledTimes(3);
	});

	test("non-direct delegation with refresh", () => {
		let ctx!: Context;
		function* Child(this: Context) {
			ctx = this;
			while (true) {
				yield null;
				yield (
					<Fragment>
						<Fragment>
							<button>Click me</button>
						</Fragment>
					</Fragment>
				);
			}
		}

		const mock = jest.fn();
		function* Parent(this: Context) {
			this.addEventListener("click", (ev) => {
				if ((ev.target as HTMLElement).tagName === "BUTTON") {
					mock();
				}
			});

			while (true) {
				yield (
					<Fragment>
						<Fragment>
							<Child />
						</Fragment>
					</Fragment>
				);
			}
		}

		renderer.render(
			<div>
				<Parent />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div></div>");

		ctx.refresh();
		expect(document.body.innerHTML).toEqual(
			"<div><button>Click me</button></div>",
		);
		const button = document.body.firstChild!.firstChild as HTMLButtonElement;
		button.click();
		button.click();
		button.click();
		expect(mock).toHaveBeenCalledTimes(3);

		renderer.render(null, document.body);
		button.click();
		button.click();
		button.click();
		expect(mock).toHaveBeenCalledTimes(3);
	});

	test("refresh on click", () => {
		function* Component(this: Context): Generator<string> {
			let count = 0;
			this.addEventListener("click", (ev) => {
				if ((ev.target as HTMLElement).id === "button") {
					count++;
					this.refresh();
				}
			});

			while (true) {
				yield (
					<div>
						<button id="button">Click me</button>
						<span>Button has been clicked {count} times</span>
					</div>
				);
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual(
			'<div><button id="button">Click me</button><span>Button has been clicked 0 times</span></div>',
		);

		const button = document.getElementById("button")!;
		button.click();
		expect(document.body.innerHTML).toEqual(
			'<div><button id="button">Click me</button><span>Button has been clicked 1 times</span></div>',
		);
		button.click();
		button.click();
		button.click();
		expect(document.body.innerHTML).toEqual(
			'<div><button id="button">Click me</button><span>Button has been clicked 4 times</span></div>',
		);
	});

	test("unmount and dispatch", () => {
		let ctx!: Context;
		function Component(this: Context) {
			ctx = this;
			return <span>Hello</span>;
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		const listener1 = jest.fn();
		const listener2 = jest.fn();
		ctx.addEventListener("foo", listener1);
		ctx.addEventListener("bar", listener1);
		ctx.dispatchEvent(new Event("foo"));
		expect(listener1).toHaveBeenCalledTimes(1);
		expect(listener2).toHaveBeenCalledTimes(0);
		renderer.render(null, document.body);
		ctx.dispatchEvent(new Event("foo"));
		ctx.dispatchEvent(new Event("bar"));
		expect(listener1).toHaveBeenCalledTimes(1);
		expect(listener2).toHaveBeenCalledTimes(0);
	});

	test("error thrown in listener and dispatchEvent", () => {
		let ctx!: Context;
		function Component(this: Context) {
			ctx = this;
			return <span>Hello</span>;
		}

		const mock = jest.spyOn(console, "error").mockImplementation();
		try {
			renderer.render(
				<div>
					<Component />
				</div>,
				document.body,
			);

			const error = new Error("error thrown in listener and dispatchEvent");
			const listener = () => {
				throw error;
			};
			ctx.addEventListener("foo", listener);
			ctx.dispatchEvent(new Event("foo"));
			expect(mock).toHaveBeenCalledWith(error);
		} finally {
			mock.mockRestore();
		}
	});
});
