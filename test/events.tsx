import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

import {Context, createElement, Element, Fragment} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("events");
test.before.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test.after.each(() => {
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
	Assert.is(mock.callCount, 3);
});

test("onevent camelCased", () => {
	const mock = Sinon.fake();
	renderer.render(<button onClick={mock}>Click me</button>, document.body);

	const button = document.body.firstChild as HTMLButtonElement;
	button.click()!;
	button.click()!;
	button.click()!;
	Assert.is(mock.callCount, 3);
});

test("onevent SVG", () => {
	const mock = Sinon.fake();
	renderer.render(<svg onclick={mock} />, document.body);

	const svg = document.body.firstChild as SVGSVGElement;
	svg.dispatchEvent(new Event("click"));
	svg.dispatchEvent(new Event("click"));
	svg.dispatchEvent(new Event("click"));
	Assert.is(mock.callCount, 3);
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
	Assert.is(mock.callCount, 3);
	renderer.render(<Button />, document.body);
	renderer.render(<Button />, document.body);
	renderer.render(<Button />, document.body);
	renderer.render(<Button />, document.body);
	renderer.render(<Button />, document.body);
	Assert.is(mock.callCount, 3);
	Assert.is(document.body.firstChild, button);
	button.click();
	button.click();
	button.click();
	Assert.is(mock.callCount, 6);
	renderer.render(null, document.body);
	button.click();
	button.click();
	button.click();
	Assert.is(mock.callCount, 6);
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
	Assert.is(document.body.innerHTML, "<div><button>Click me</button></div>");
	const div = document.body.firstChild!;
	const button = div.firstChild!;
	const divAddEventListener = Sinon.spy(div, "addEventListener");
	const divRemoveEventListener = Sinon.spy(div, "removeEventListener");
	const buttonAddEventListener = Sinon.spy(button, "addEventListener");
	const buttonRemoveEventListener = Sinon.spy(button, "removeEventListener");
	const listener = Sinon.fake();
	ctx.addEventListener("click", listener);
	Assert.is(divAddEventListener.callCount, 1);
	Assert.equal(divAddEventListener.lastCall.args, ["click", listener, {}]);
	Assert.is(buttonAddEventListener.callCount, 0);
	Assert.is(divRemoveEventListener.callCount, 0);
	Assert.is(buttonRemoveEventListener.callCount, 0);
	renderer.render(null, document.body);
	Assert.is(divRemoveEventListener.callCount, 1);
	Assert.equal(divRemoveEventListener.lastCall.args, ["click", listener, {}]);
	Assert.is(buttonRemoveEventListener.callCount, 0);
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
	Assert.is(document.body.innerHTML, "<div><button>Click me</button></div>");
	const div = document.body.firstChild!;
	const button = div.firstChild!;
	const divAddEventListener = Sinon.spy(div, "addEventListener");
	const divRemoveEventListener = Sinon.spy(div, "removeEventListener");
	const buttonAddEventListener = Sinon.spy(button, "addEventListener");
	const buttonRemoveEventListener = Sinon.spy(button, "removeEventListener");
	const listener = Sinon.fake();
	ctx.addEventListener("click", listener);
	Assert.is(divAddEventListener.callCount, 1);
	Assert.equal(divAddEventListener.lastCall.args, ["click", listener, {}]);
	Assert.is(buttonAddEventListener.callCount, 0);
	Assert.is(divRemoveEventListener.callCount, 0);
	Assert.is(buttonRemoveEventListener.callCount, 0);
	ctx.refresh();
	Assert.is(document.body.innerHTML, "");
	Assert.is(divRemoveEventListener.callCount, 1);
	Assert.equal(divRemoveEventListener.lastCall.args, ["click", listener, {}]);
	Assert.is(buttonRemoveEventListener.callCount, 0);
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
	Assert.is(document.body.innerHTML, "<div><button>Click me</button></div>");
	const button = document.body.firstChild!.firstChild as HTMLButtonElement;
	button.click();
	button.click();
	button.click();
	Assert.is(mock.callCount, 3);
	renderer.render(null, document.body);
	button.click();
	button.click();
	button.click();
	Assert.is(mock.callCount, 3);
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
	Assert.is(document.body.innerHTML, "<div></div>");

	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div><button>Click me</button></div>");
	const button = document.body.firstChild!.firstChild as HTMLButtonElement;
	button.click();
	button.click();
	button.click();
	Assert.is(mock.callCount, 3);

	renderer.render(null, document.body);
	button.click();
	button.click();
	button.click();
	Assert.is(mock.callCount, 3);
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
	Assert.is(
		document.body.innerHTML,
		'<div><button id="button">Click me</button><span>Button has been clicked 0 times</span></div>',
	);

	const button = document.getElementById("button")!;
	button.click();
	Assert.is(
		document.body.innerHTML,
		'<div><button id="button">Click me</button><span>Button has been clicked 1 times</span></div>',
	);
	button.click();
	button.click();
	button.click();
	Assert.is(
		document.body.innerHTML,
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
	Assert.is(
		document.body.innerHTML,
		'<div><button id="button">Click me</button><span>Button has been clicked 0 times</span></div>',
	);

	const button = document.getElementById("button")!;
	button.click();
	Assert.is(
		document.body.innerHTML,
		'<div><button id="button">Click me</button><span>Button has been clicked 1 times</span></div>',
	);
	button.click();
	button.click();
	button.click();
	Assert.is(
		document.body.innerHTML,
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

	const listener1 = Sinon.fake();
	const listener2 = Sinon.fake();
	ctx.addEventListener("foo", listener1);
	ctx.addEventListener("bar", listener1);
	ctx.dispatchEvent(new Event("foo"));
	Assert.is(listener1.callCount, 1);
	Assert.is(listener2.callCount, 0);
	renderer.render(null, document.body);
	ctx.dispatchEvent(new Event("foo"));
	ctx.dispatchEvent(new Event("bar"));
	Assert.is(listener1.callCount, 1);
	Assert.is(listener2.callCount, 0);
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
	Assert.is(mock.callCount, 1);
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
	Assert.is(mock.callCount, 1);
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
		Assert.is(mock.lastCall.args[0], error);
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
		Assert.is(mock.callCount, 1);
		Assert.is(listener2.callCount, 1);
	} finally {
		mock.restore();
	}
});

test.run();
