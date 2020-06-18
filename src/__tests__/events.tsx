/** @jsx createElement */
import {Context, createElement, Element} from "../index";
import {renderer} from "../dom";

describe("events", () => {
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
});
