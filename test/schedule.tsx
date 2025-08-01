import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";
import {
	createElement,
	Children,
	Context,
	Copy,
	Element,
	Fragment,
} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("schedule");

test.before.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("function once", () => {
	let i = 0;
	const fn = Sinon.fake();
	function Component(this: Context): Element {
		if (i === 0) {
			this.schedule(fn);
		}

		return <span>{i++}</span>;
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>0</span></div>");
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
	Assert.is(fn.callCount, 1);

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
	Assert.is(fn.callCount, 1);
});

test("function every", () => {
	let i = 0;
	const fn = Sinon.fake();
	function Component(this: Context): Element {
		this.schedule(fn);
		return <span>{i++}</span>;
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>0</span></div>");
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
	Assert.is(fn.callCount, 1);
	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
	Assert.is(fn.callCount, 2);
});

test("generator once", () => {
	const fn = Sinon.fake();
	function* Component(this: Context): Generator<Element> {
		this.schedule(fn);
		let i = 0;
		while (true) {
			yield <span>{i++}</span>;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>0</span></div>");
	Assert.is(fn.callCount, 1);

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(fn.callCount, 1);
});

test("generator every", () => {
	const fn = Sinon.fake();
	function* Component(this: Context): Generator<Element> {
		let i = 0;
		while (true) {
			this.schedule(fn);
			yield <span>{i++}</span>;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>0</span></div>");
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
	Assert.is(fn.callCount, 1);
	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
	Assert.is(fn.callCount, 2);
});

test("async function once", async () => {
	let i = 0;
	const fn = Sinon.fake();
	async function Component(this: Context): Promise<Element> {
		if (i === 0) {
			this.schedule(fn);
		}

		await new Promise((resolve) => setTimeout(resolve, 1));
		return <span>{i++}</span>;
	}

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>0</span></div>");
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
	Assert.is(fn.callCount, 1);

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(fn.callCount, 1);
});

test("async function every", async () => {
	let i = 0;
	const fn = Sinon.fake();
	async function Component(this: Context): Promise<Element> {
		this.schedule(fn);
		await new Promise((resolve) => setTimeout(resolve, 1));
		return <span>{i++}</span>;
	}

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>0</span></div>");
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
	Assert.is(fn.callCount, 1);

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(fn.callCount, 2);
});

test("async generator once", async () => {
	const fn = Sinon.fake();
	async function* Component(this: Context): AsyncGenerator<Element> {
		this.schedule(fn);
		let i = 0;
		for await (const _ of this) {
			yield <span>{i++}</span>;
		}
	}

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>0</span></div>");
	Assert.is(fn.callCount, 1);

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(fn.callCount, 1);
});

test("async generator every", async () => {
	const fn = Sinon.fake();
	async function* Component(this: Context): AsyncGenerator<Element> {
		let i = 0;
		for await (const _ of this) {
			this.schedule(fn);
			yield <span>{i++}</span>;
		}
	}

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>0</span></div>");
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
	Assert.is(fn.callCount, 1);
	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
	Assert.is(fn.callCount, 2);
});

test("multiple calls, same fn", () => {
	const fn = Sinon.fake();
	function* Component(this: Context): Generator<Element> {
		this.schedule(fn);
		this.schedule(fn);
		while (true) {
			yield <span>Hello</span>;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	const span = document.body.firstChild!.firstChild;
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], span);
});

test("multiple calls, different fns", () => {
	const fn1 = Sinon.fake();
	const fn2 = Sinon.fake();
	function* Component(this: Context): Generator<Element> {
		this.schedule(fn1);
		this.schedule(fn2);
		while (true) {
			yield <span>Hello</span>;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	const span = document.body.firstChild!.firstChild;
	Assert.is(fn1.callCount, 1);
	Assert.is(fn1.lastCall.args[0], span);
	Assert.is(fn2.callCount, 1);
	Assert.is(fn2.lastCall.args[0], span);
});

test("multiple calls across updates", () => {
	const fn1 = Sinon.fake();
	const fn2 = Sinon.fake();
	function* Component(this: Context): Generator<Element> {
		let i = 0;
		while (true) {
			this.schedule(fn1);
			this.schedule(fn2);
			this.schedule(fn2);
			yield <span>{i++}</span>;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>0</span></div>");
	const span = document.body.firstChild!.firstChild;

	Assert.is(fn1.callCount, 1);
	Assert.is(fn2.callCount, 1);
	Assert.is(fn1.lastCall.args[0], span);
	Assert.is(fn2.lastCall.args[0], span);

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(fn1.callCount, 2);
	Assert.is(fn2.callCount, 2);
	Assert.is(fn1.lastCall.args[0], span);
	Assert.is(fn2.lastCall.args[0], span);

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>2</span></div>");
	Assert.is(fn1.callCount, 3);
	Assert.is(fn2.callCount, 3);
	Assert.is(fn1.lastCall.args[0], span);
	Assert.is(fn2.lastCall.args[0], span);
});

test("refresh", () => {
	const mock = Sinon.fake();
	function* Component(this: Context): Generator<Element> {
		let i = 0;
		while (true) {
			mock();
			if (i % 2 === 0) {
				this.schedule(() => this.refresh());
			}
			yield <span>{i++}</span>;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>3</span></div>");
	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>5</span></div>");
	Assert.is(mock.callCount, 6);
});

test("refresh copy", () => {
	function* Component(this: Context): Generator<Element> {
		this.schedule(() => this.refresh());
		const span = (yield <span />) as HTMLSpanElement;
		while (true) {
			span.className = "manual";
			span.textContent = "Hello world";
			yield <Copy />;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		'<div><span class="manual">Hello world</span></div>',
	);
});

test("refresh copy alternating", () => {
	function* Component(this: Context): Generator<Element> {
		let i = 0;
		let span: HTMLSpanElement | undefined;
		while (true) {
			if (span === undefined) {
				this.schedule(() => this.refresh());
				span = (yield <span />) as HTMLSpanElement;
			} else {
				span.className = "manual";
				span.textContent = (i++).toString();
				span = undefined;
				yield <Copy />;
			}
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		'<div><span class="manual">0</span></div>',
	);
});

test("component child", () => {
	const fn = Sinon.fake();
	function Child(): Element {
		return <span>Hello</span>;
	}

	function* Component(this: Context): Generator<Element> {
		this.schedule(fn);
		while (true) {
			yield <Child />;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");

	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
});

test("fragment child", () => {
	const fn = Sinon.fake();
	function* Component(this: Context): Generator<Element> {
		this.schedule(fn);
		while (true) {
			yield (
				<Fragment>
					<span>1</span>
					<span>2</span>
					<span>3</span>
				</Fragment>
			);
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span></div>",
	);

	Assert.is(fn.callCount, 1);
	Assert.equal(
		fn.lastCall.args[0],
		Array.from(document.body.firstChild!.childNodes),
	);
});

test("async children once", async () => {
	const fn = Sinon.fake();
	async function Child({children}: {children: Children}): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 5));
		return <span>{children}</span>;
	}

	function* Component(this: Context): Generator<Element> {
		this.schedule(fn);
		while (true) {
			yield <Child>async</Child>;
		}
	}

	const p = renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(fn.callCount, 0);
	await p;
	Assert.is(document.body.innerHTML, "<div><span>async</span></div>");
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
	Assert.is(fn.callCount, 1);
});

test("async children every", async () => {
	const fn = Sinon.fake();
	async function Child({children}: {children: Children}): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 5));
		return <span>{children}</span>;
	}

	function* Component(this: Context): Generator<Element> {
		let i = 0;
		while (true) {
			this.schedule(fn);
			yield <Child>async {i++}</Child>;
		}
	}

	let p = renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(fn.callCount, 0);
	await p;
	Assert.is(document.body.innerHTML, "<div><span>async 0</span></div>");
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
	Assert.is(fn.callCount, 1);
	p = renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(fn.callCount, 1);
	await p;
	Assert.is(document.body.innerHTML, "<div><span>async 1</span></div>");
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
	Assert.is(fn.callCount, 2);
});

test("hanging child", async () => {
	const fn = Sinon.fake();
	async function Hanging(): Promise<never> {
		await new Promise(() => {});
		throw new Error("This should never be reached");
	}

	function* Component(this: Context): Generator<Element> {
		this.schedule(fn);
		while (true) {
			yield <Hanging />;
		}
	}

	const p = renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(fn.callCount, 0);
	Assert.is(document.body.innerHTML, "");
	renderer.render(<div />, document.body);
	Assert.is(document.body.innerHTML, "<div></div>");
	Assert.is(fn.callCount, 0);
	await p;
	Assert.is(fn.callCount, 0);
});

// https://github.com/bikeshaving/crank/issues/199
test("refresh with component", () => {
	function Component({children}: {children: Children}) {
		return <p>{children}</p>;
	}

	function* Parent(this: Context) {
		this.schedule(() => this.refresh());
		yield <p>Render 1</p>;
		yield <Component>Render 2</Component>;
	}

	renderer.render(<Parent />, document.body);
	Assert.is(document.body.innerHTML, "<p>Render 2</p>");
});

test("async schedule defers insertion", async () => {
	let resolve!: Function;
	function* Component(this: Context): Generator<Element> {
		this.schedule(() => new Promise((r) => (resolve = r)));
		for ({} of this) {
			yield <span>Hello world</span>;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div></div>");
	resolve();
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(document.body.innerHTML, "<div><span>Hello world</span></div>");
});

test("async schedule shows previous while we wait", async () => {
	let resolve!: Function;
	function* Component(this: Context): Generator<Element> {
		this.schedule(() => new Promise((r) => (resolve = r)));
		for ({} of this) {
			yield <span>Hello from component</span>;
		}
	}

	renderer.render(
		<div>
			<span>Hello world</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Hello world</span></div>");
	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>Hello world</span></div>");

	resolve();
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(
		document.body.innerHTML,
		"<div><span>Hello from component</span></div>",
	);
});

test("async schedule after first render does nothing", async () => {
	let resolve!: Function;
	function* Component(this: Context): Generator<Element> {
		let i = 0;
		for ({} of this) {
			this.schedule(() => new Promise((r) => (resolve = r)));
			yield <span key={i}>Render {i++}</span>;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div></div>");
	resolve();
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(document.body.innerHTML, "<div><span>Render 0</span></div>");

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Render 1</span></div>");

	resolve();
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(document.body.innerHTML, "<div><span>Render 1</span></div>");
});

test("async schedule with refresh", async () => {
	let resolve!: Function;
	function* Component(this: Context): Generator<Element> {
		let i = 0;
		for ({} of this) {
			this.schedule(async () => {
				await new Promise((r) => (resolve = r));
				this.refresh();
			});
			yield <span>Render {i++}</span>;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div></div>");
	resolve();
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(document.body.innerHTML, "<div><span>Render 1</span></div>");
});

test("async mounting with component fallback", async () => {
	let resolve!: Function;

	function Fallback(): Element {
		return (
			<Fragment>
				<span>Loading...</span>
				<button>Cancel</button>
			</Fragment>
		);
	}

	function* AsyncComponent(this: Context): Generator<Element> {
		this.schedule(() => new Promise((r) => (resolve = r)));
		for ({} of this) {
			yield <span>Loaded content</span>;
		}
	}

	// Initial render with fallback
	renderer.render(
		<div>
			<Fallback />
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>Loading...</span><button>Cancel</button></div>",
	);

	// Replace with async component - should show fallback while scheduling
	renderer.render(
		<div>
			<AsyncComponent />
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>Loading...</span><button>Cancel</button></div>",
	);

	// Resolve async component - should replace fallback
	resolve();
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(document.body.innerHTML, "<div><span>Loaded content</span></div>");
});

test("replacing async scheduling component", async () => {
	let resolve2!: Function;

	function* SchedulingComponent1(this: Context): Generator<Element> {
		this.schedule(() => new Promise(() => {})); // Never resolves
		for ({} of this) {
			yield <span>Component 1</span>;
		}
	}

	function* SchedulingComponent2(this: Context): Generator<Element> {
		this.schedule(() => new Promise((r) => (resolve2 = r)));
		for ({} of this) {
			yield <span>Component 2</span>;
		}
	}

	// Render first scheduling component
	renderer.render(
		<div>
			<SchedulingComponent1 />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div></div>");

	// Replace with second scheduling component before first resolves
	renderer.render(
		<div>
			<SchedulingComponent2 />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div></div>");

	// First component never resolves, so should stay empty

	// Resolve second component (should render)
	resolve2();
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(document.body.innerHTML, "<div><span>Component 2</span></div>");
});

test("async schedule inside async function", async () => {
	let scheduleResolve!: Function;

	async function AsyncComponent(this: Context): Promise<Element> {
		this.schedule(() => new Promise((r) => (scheduleResolve = r)));
		await new Promise((resolve) => setTimeout(resolve, 1));
		return <span>Async Function Component</span>;
	}

	const renderPromise = renderer.render(
		<div>
			<AsyncComponent />
		</div>,
		document.body,
	);

	// Should be completely empty while async function is pending
	Assert.is(document.body.innerHTML, "");

	// Component function resolves but schedule is still pending
	await renderPromise;
	Assert.is(document.body.innerHTML, "<div></div>");

	// Schedule resolves, component should appear
	scheduleResolve();
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(
		document.body.innerHTML,
		"<div><span>Async Function Component</span></div>",
	);
});

test("replacing async component that has resolved", async () => {
	let resolve1!: Function;
	let resolve2!: Function;

	async function AsyncComponent(): Promise<Element> {
		await new Promise((resolve) => (resolve1 = resolve));
		return <span>Async Component</span>;
	}

	function* SchedulingComponent(this: Context): Generator<Element> {
		this.schedule(() => new Promise((r) => (resolve2 = r)));
		for ({} of this) {
			yield <span>Scheduling Component</span>;
		}
	}

	const result1 = renderer.render(
		<div>
			<AsyncComponent />
		</div>,
		document.body,
	);

	Assert.instance(result1, Promise);
	Assert.is(document.body.innerHTML, "");
	resolve1();
	await result1;
	Assert.is(document.body.innerHTML, "<div><span>Async Component</span></div>");

	const result2 = renderer.render(
		<div>
			<SchedulingComponent />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>Async Component</span></div>");
	Assert.is(document.body.firstChild, result2);

	resolve2();
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(
		document.body.innerHTML,
		"<div><span>Scheduling Component</span></div>",
	);
});

test("replacing async component that is pending", async () => {
	let resolve1!: Function;
	let resolve2!: Function;

	async function AsyncComponent(): Promise<Element> {
		await new Promise((resolve) => (resolve1 = resolve));
		return <span>Async Component</span>;
	}

	function* SchedulingComponent(this: Context): Generator<Element> {
		this.schedule(() => new Promise((r) => (resolve2 = r)));
		for ({} of this) {
			yield <span>Scheduling Component</span>;
		}
	}

	const result1 = renderer.render(
		<div>
			<AsyncComponent />
		</div>,
		document.body,
	);

	Assert.instance(result1, Promise);
	Assert.is(document.body.innerHTML, "");
	const result2 = renderer.render(
		<div>
			<SchedulingComponent />
		</div>,
		document.body,
	);

	// This kinda makes sense?
	Assert.is(document.body.innerHTML, "<div></div>");
	Assert.is(document.body.firstChild, result2);
	resolve1();
	await new Promise((resolve) => setTimeout(resolve));
	await result1;
	Assert.is(document.body.innerHTML, "<div><span>Async Component</span></div>");

	resolve2();
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(
		document.body.innerHTML,
		"<div><span>Scheduling Component</span></div>",
	);
});

test.run();
