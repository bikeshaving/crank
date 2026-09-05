import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
import * as Sinon from "sinon";

import type {Context, Element} from "../src/crank.js";
import {createElement, Fragment} from "../src/crank.js";
import {renderer} from "../src/dom.js";

describe("events", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("onevent", () => {
		const mock = Sinon.fake();
		renderer.render(<button onclick={mock}>Click me</button>, document.body);

		const button = document.body.firstChild as HTMLButtonElement;
		button.click()!;
		button.click()!;
		button.click()!;
		expect(mock.callCount).toBe(3);
	});

	test("onevent camelCased", () => {
		const mock = Sinon.fake();
		renderer.render(<button onClick={mock}>Click me</button>, document.body);

		const button = document.body.firstChild as HTMLButtonElement;
		button.click()!;
		button.click()!;
		button.click()!;
		expect(mock.callCount).toBe(3);
	});

	test("onevent SVG", () => {
		const mock = Sinon.fake();
		renderer.render(<svg onclick={mock} />, document.body);

		const svg = document.body.firstChild as SVGSVGElement;
		svg.dispatchEvent(new Event("click"));
		svg.dispatchEvent(new Event("click"));
		svg.dispatchEvent(new Event("click"));
		expect(mock.callCount).toBe(3);
	});

	test("function component", () => {
		const mock = Sinon.fake();

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
		expect(mock.callCount).toBe(3);
		renderer.render(<Button />, document.body);
		renderer.render(<Button />, document.body);
		renderer.render(<Button />, document.body);
		renderer.render(<Button />, document.body);
		renderer.render(<Button />, document.body);
		expect(mock.callCount).toBe(3);
		expect(document.body.firstChild).toBe(button);
		button.click();
		button.click();
		button.click();
		expect(mock.callCount).toBe(6);
		renderer.render(null, document.body);
		button.click();
		button.click();
		button.click();
		expect(mock.callCount).toBe(6);
	});

	test("delegation", () => {
		let ctx!: Context;

		function* Component(this: Context): Generator<Element> {
			ctx = this;
			for ({} of this) {
				yield (
					<div>
						<button>Click me</button>
					</div>
				);
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe(
			"<div><button>Click me</button></div>",
		);
		const div = document.body.firstChild!;
		const button = div.firstChild!;
		const divAddEventListener = Sinon.spy(div, "addEventListener");
		const divRemoveEventListener = Sinon.spy(div, "removeEventListener");
		const buttonAddEventListener = Sinon.spy(button, "addEventListener");
		const buttonRemoveEventListener = Sinon.spy(button, "removeEventListener");
		const listener = Sinon.fake();
		ctx.addEventListener("click", listener);
		expect(divAddEventListener.callCount).toBe(1);
		expect(divAddEventListener.lastCall.args).toEqual(["click", listener, {}]);
		expect(buttonAddEventListener.callCount).toBe(0);
		expect(divRemoveEventListener.callCount).toBe(0);
		expect(buttonRemoveEventListener.callCount).toBe(0);
		renderer.render(null, document.body);
		expect(divRemoveEventListener.callCount).toBe(1);
		expect(divRemoveEventListener.lastCall.args).toEqual([
			"click",
			listener,
			{},
		]);
		expect(buttonRemoveEventListener.callCount).toBe(0);
	});

	test("delegation with unmounting children", () => {
		let ctx!: Context;

		function* Component(this: Context): Generator<Element | null> {
			ctx = this;
			yield (
				<div>
					<button>Click me</button>
				</div>
			);

			yield null;
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe(
			"<div><button>Click me</button></div>",
		);
		const div = document.body.firstChild!;
		const button = div.firstChild!;
		const divAddEventListener = Sinon.spy(div, "addEventListener");
		const divRemoveEventListener = Sinon.spy(div, "removeEventListener");
		const buttonAddEventListener = Sinon.spy(button, "addEventListener");
		const buttonRemoveEventListener = Sinon.spy(button, "removeEventListener");
		const listener = Sinon.fake();
		ctx.addEventListener("click", listener);
		expect(divAddEventListener.callCount).toBe(1);
		expect(divAddEventListener.lastCall.args).toEqual(["click", listener, {}]);
		expect(buttonAddEventListener.callCount).toBe(0);
		expect(divRemoveEventListener.callCount).toBe(0);
		expect(buttonRemoveEventListener.callCount).toBe(0);
		ctx.refresh();
		expect(document.body.innerHTML).toBe("");
		expect(divRemoveEventListener.callCount).toBe(1);
		expect(divRemoveEventListener.lastCall.args).toEqual([
			"click",
			listener,
			{},
		]);
		expect(buttonRemoveEventListener.callCount).toBe(0);
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

		const mock = Sinon.fake();

		function* Parent(this: Context) {
			this.addEventListener("click", () => {
				mock();
			});
			for ({} of this) {
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
		expect(document.body.innerHTML).toBe(
			"<div><button>Click me</button></div>",
		);
		const button = document.body.firstChild!.firstChild as HTMLButtonElement;
		button.click();
		button.click();
		button.click();
		expect(mock.callCount).toBe(3);
		renderer.render(null, document.body);
		button.click();
		button.click();
		button.click();
		expect(mock.callCount).toBe(3);
	});

	test("non-direct delegation with refresh", () => {
		let ctx!: Context;

		function* Child(this: Context) {
			ctx = this;
			yield null;
			for ({} of this) {
				yield (
					<Fragment>
						<Fragment>
							<button>Click me</button>
						</Fragment>
					</Fragment>
				);
			}
		}

		const mock = Sinon.fake();

		function* Parent(this: Context) {
			this.addEventListener("click", (ev) => {
				if ((ev.target as HTMLElement).tagName === "BUTTON") {
					mock();
				}
			});

			for ({} of this) {
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
		expect(document.body.innerHTML).toBe("<div></div>");

		ctx.refresh();
		expect(document.body.innerHTML).toBe(
			"<div><button>Click me</button></div>",
		);
		const button = document.body.firstChild!.firstChild as HTMLButtonElement;
		button.click();
		button.click();
		button.click();
		expect(mock.callCount).toBe(3);

		renderer.render(null, document.body);
		button.click();
		button.click();
		button.click();
		expect(mock.callCount).toBe(3);
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

			for ({} of this) {
				yield (
					<div>
						<button id="button">Click me</button>
						<span>Button has been clicked {count} times</span>
					</div>
				);
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe(
			'<div><button id="button">Click me</button><span>Button has been clicked 0 times</span></div>',
		);

		const button = document.getElementById("button")!;
		button.click();
		expect(document.body.innerHTML).toBe(
			'<div><button id="button">Click me</button><span>Button has been clicked 1 times</span></div>',
		);
		button.click();
		button.click();
		button.click();
		expect(document.body.innerHTML).toBe(
			'<div><button id="button">Click me</button><span>Button has been clicked 4 times</span></div>',
		);
	});

	test("refresh callback", () => {
		function* Component(this: Context): Generator<string> {
			let count = 0;
			this.addEventListener("click", (ev) => {
				if ((ev.target as HTMLElement).id === "button") {
					this.refresh(() => {
						count++;
					});
				}
			});

			for ({} of this) {
				yield (
					<div>
						<button id="button">Click me</button>
						<span>Button has been clicked {count} times</span>
					</div>
				);
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe(
			'<div><button id="button">Click me</button><span>Button has been clicked 0 times</span></div>',
		);

		const button = document.getElementById("button")!;
		button.click();
		expect(document.body.innerHTML).toBe(
			'<div><button id="button">Click me</button><span>Button has been clicked 1 times</span></div>',
		);
		button.click();
		button.click();
		button.click();
		expect(document.body.innerHTML).toBe(
			'<div><button id="button">Click me</button><span>Button has been clicked 4 times</span></div>',
		);
	});

	test("async refresh callback", async () => {
		let resolve!: (value?: any) => void;

		function* Component(this: Context): Generator<string> {
			let count = 0;
			this.addEventListener("click", (ev) => {
				if ((ev.target as HTMLElement).id === "button") {
					this.refresh(async () => {
						await new Promise((resolve1) => (resolve = resolve1));
						count++;
					});
				}
			});

			for ({} of this) {
				yield (
					<div>
						<button id="button">Click me</button>
						<span>Button has been clicked {count} times</span>
					</div>
				);
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe(
			'<div><button id="button">Click me</button><span>Button has been clicked 0 times</span></div>',
		);

		const button = document.getElementById("button")!;
		button.click();

		expect(document.body.innerHTML).toBe(
			'<div><button id="button">Click me</button><span>Button has been clicked 0 times</span></div>',
		);

		resolve();
		await new Promise((resolve) => setTimeout(resolve));

		expect(document.body.innerHTML).toBe(
			'<div><button id="button">Click me</button><span>Button has been clicked 1 times</span></div>',
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

		const listener1 = Sinon.fake();
		const listener2 = Sinon.fake();
		ctx.addEventListener("foo", listener1);
		ctx.addEventListener("bar", listener1);
		ctx.dispatchEvent(new Event("foo"));
		expect(listener1.callCount).toBe(1);
		expect(listener2.callCount).toBe(0);
		renderer.render(null, document.body);
		ctx.dispatchEvent(new Event("foo"));
		ctx.dispatchEvent(new Event("bar"));
		expect(listener1.callCount).toBe(1);
		expect(listener2.callCount).toBe(0);
	});

	test("event props", () => {
		let ctx!: Context;

		function Component(this: Context, _props: {onfoo: (ev: Event) => any}) {
			ctx = this;
			return <span>Hello</span>;
		}

		const mock = Sinon.fake();
		renderer.render(<Component onfoo={mock} />, document.body);
		ctx.dispatchEvent(new Event("foo"));
		expect(mock.callCount).toBe(1);
	});

	test("event props camelCased", () => {
		let ctx!: Context;

		function Component(this: Context, _props: {onFoo: (ev: Event) => any}) {
			ctx = this;
			return <span>Hello</span>;
		}

		const mock = Sinon.fake();
		renderer.render(<Component onFoo={mock} />, document.body);
		ctx.dispatchEvent(new Event("foo"));
		expect(mock.callCount).toBe(1);
	});

	test("error thrown in listener", () => {
		let ctx!: Context;

		function Component(this: Context) {
			ctx = this;
			return <span>Hello</span>;
		}

		const mock = Sinon.stub(console, "error");
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
			expect(mock.lastCall.args[0]).toBe(error);
		} finally {
			mock.restore();
		}
	});

	test("errors do not affect other listeners", () => {
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

		const mock = Sinon.stub(console, "error");
		const listener1 = () => {
			throw new Error("errors do not affect other listeners");
		};

		const listener2 = Sinon.mock();

		try {
			ctx.addEventListener("foo", listener1);
			ctx.addEventListener("foo", listener2);
			ctx.dispatchEvent(new Event("foo"));
			expect(mock.callCount).toBe(1);
			expect(listener2.callCount).toBe(1);
		} finally {
			mock.restore();
		}
	});
});
