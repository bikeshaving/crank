import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";
import {hangs} from "./utils.js";
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
interface ResolvingComponent {
	(props?: Record<string, any>): any;
	resolves: Array<Function>;
}

const AsyncComponent = async function ({
	children,
}: {
	children: Children;
}): Promise<Children> {
	await new Promise((resolve) => AsyncComponent.resolves.push(resolve));
	return children;
} as ResolvingComponent;

AsyncComponent.resolves = [];

const AsyncMountingComponent = function* (
	this: Context,
	{children}: {children: Children},
): Generator<Children> {
	this.schedule(
		() =>
			new Promise((resolve) => AsyncMountingComponent.resolves.push(resolve)),
	);
	for ({children} of this) {
		yield children;
	}
} as unknown as ResolvingComponent;
AsyncMountingComponent.resolves = [];

test.before.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
	AsyncComponent.resolves = [];
	AsyncMountingComponent.resolves = [];
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
		for ({} of this) {
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
		for ({} of this) {
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
		for ({} of this) {
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
		for ({} of this) {
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
		for ({} of this) {
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
		for ({} of this) {
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
		for ({} of this) {
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
		for ({} of this) {
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
		for ({} of this) {
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
		for ({} of this) {
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
		for ({} of this) {
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
		for ({} of this) {
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
		for ({} of this) {
			yield <Hanging />;
		}
	}

	const p = renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	await hangs(p);
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

test("refresh with async component", async () => {
	async function Component({children}: {children: Children}) {
		await new Promise((resolve) => setTimeout(resolve, 1));
		return <p>{children}</p>;
	}

	function* Parent(this: Context) {
		this.schedule(() => this.refresh());
		yield <p>Render 1</p>;
		yield <Component>Render 2</Component>;
	}

	const result = renderer.render(
		<Parent />,
		document.body,
	) as Promise<HTMLElement>;

	Assert.is((await result).outerHTML, "<p>Render 2</p>");
	Assert.is(document.body.innerHTML, "<p>Render 2</p>");
});

test("async mount defers insertion", async () => {
	const result = renderer.render(
		<div>
			<AsyncMountingComponent>
				<span>Hello world</span>
			</AsyncMountingComponent>
		</div>,
		document.body,
	) as Promise<HTMLElement>;

	Assert.is(document.body.innerHTML, "<div></div>");
	AsyncMountingComponent.resolves[0]();
	Assert.is((await result).outerHTML, "<div><span>Hello world</span></div>");
});

test("async mount with host fallback", async () => {
	renderer.render(
		<div>
			<span>Hello world</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Hello world</span></div>");
	const result = renderer.render(
		<div>
			<AsyncMountingComponent>
				<span>Hello from component</span>
			</AsyncMountingComponent>
		</div>,
		document.body,
	) as Promise<HTMLElement>;

	Assert.is(document.body.innerHTML, "<div><span>Hello world</span></div>");
	AsyncMountingComponent.resolves[0]();
	Assert.is(
		(await result).outerHTML,
		"<div><span>Hello from component</span></div>",
	);
});

// TODO: async updating
test("async schedule does not work after initial render", async () => {
	let resolve!: Function;
	function* Component(this: Context): Generator<Element> {
		let i = 0;
		for ({} of this) {
			this.schedule(() => new Promise((r) => (resolve = r)));
			yield <span key={i}>Render {i++}</span>;
		}
	}

	const result1 = renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div></div>");
	await hangs(result1);
	Assert.is(document.body.innerHTML, "<div></div>");

	resolve();
	await result1;
	Assert.is(document.body.innerHTML, "<div><span>Render 0</span></div>");
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(document.body.innerHTML, "<div><span>Render 0</span></div>");

	const result2 = renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	) as Promise<HTMLElement>;

	Assert.is((await result2).outerHTML, "<div><span>Render 1</span></div>");
	Assert.is(document.body.innerHTML, "<div><span>Render 1</span></div>");
});

test("async mount with refresh", async () => {
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

	const result = renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	) as Promise<HTMLElement>;

	Assert.is(document.body.innerHTML, "<div></div>");
	Assert.instance(result, Promise);
	resolve();
	Assert.is((await result).outerHTML, "<div><span>Render 1</span></div>");
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(document.body.innerHTML, "<div><span>Render 1</span></div>");
});

test("async mounting with component fallback", async () => {
	function Fallback(): Element {
		return (
			<Fragment>
				<span>Loading...</span>
				<button>Cancel</button>
			</Fragment>
		);
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
	const result2 = renderer.render(
		<div>
			<AsyncMountingComponent>
				<span>Loaded content</span>
			</AsyncMountingComponent>
		</div>,
		document.body,
	) as Promise<HTMLElement>;
	Assert.is(
		document.body.innerHTML,
		"<div><span>Loading...</span><button>Cancel</button></div>",
	);

	AsyncMountingComponent.resolves[0]();
	Assert.is(
		(await result2).outerHTML,
		"<div><span>Loaded content</span></div>",
	);
});

test("async mount replacing async mount component fallback", async () => {
	function SchedulingComponent1(
		this: Context,
		...args: any
	): Generator<Children> {
		return AsyncMountingComponent.apply(this, args) as any;
	}

	function SchedulingComponent2(
		this: Context,
		...args: any
	): Generator<Children> {
		return AsyncMountingComponent.apply(this, args);
	}

	const result1 = renderer.render(
		<div>
			<SchedulingComponent1>
				<span>Component 1</span>
			</SchedulingComponent1>
		</div>,
		document.body,
	) as Promise<HTMLElement>;
	Assert.is(document.body.innerHTML, "<div></div>");
	await hangs(result1);
	// Replace with second scheduling component before first resolves
	const result2 = renderer.render(
		<div>
			<SchedulingComponent2>
				<span>Component 2</span>
			</SchedulingComponent2>
		</div>,
		document.body,
	) as Promise<HTMLElement>;
	Assert.is(document.body.innerHTML, "<div></div>");
	await hangs(result2);

	// Resolve second component (should render)
	AsyncMountingComponent.resolves[1]();
	// result1 should resolve once SchedulingComponent2 resolves (because
	// component was unmounted)
	Assert.is((await result1).outerHTML, "<div><span>Component 2</span></div>");
	Assert.is((await result2).outerHTML, "<div><span>Component 2</span></div>");
});

test("async mount inside async component", async () => {
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

	// Schedule resolves, component should appear
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(document.body.innerHTML, "<div></div>");
	await hangs(renderPromise);
	Assert.is(document.body.innerHTML, "<div></div>");

	scheduleResolve();
	Assert.is(document.body.innerHTML, "<div></div>");
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(
		document.body.innerHTML,
		"<div><span>Async Function Component</span></div>",
	);

	await renderPromise;
	Assert.is(
		document.body.innerHTML,
		"<div><span>Async Function Component</span></div>",
	);
});

test("async mount replacing async component fallback that has already resolved", async () => {
	const result1 = renderer.render(
		<div>
			<AsyncComponent>
				<span>Async Component</span>
			</AsyncComponent>
		</div>,
		document.body,
	);

	Assert.instance(result1, Promise);
	Assert.is(document.body.innerHTML, "");
	AsyncComponent.resolves[0]();
	await result1;
	Assert.is(document.body.innerHTML, "<div><span>Async Component</span></div>");

	const result2 = renderer.render(
		<div>
			<AsyncMountingComponent>
				<span>Scheduling Component</span>
			</AsyncMountingComponent>
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>Async Component</span></div>");
	Assert.instance(result2, Promise);

	await hangs(result2);
	Assert.is(document.body.innerHTML, "<div><span>Async Component</span></div>");

	AsyncMountingComponent.resolves[0]();
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(
		document.body.innerHTML,
		"<div><span>Scheduling Component</span></div>",
	);
});

test("async mount replacing async component fallback that is pending and resolves", async () => {
	const result1 = renderer.render(
		<div>
			<AsyncComponent>
				<span>Async Component</span>
			</AsyncComponent>
		</div>,
		document.body,
	) as unknown as Promise<HTMLElement>;

	Assert.instance(result1, Promise);
	Assert.is(document.body.innerHTML, "");
	const result2 = renderer.render(
		<div>
			<AsyncMountingComponent>
				<span>Scheduling Component</span>
			</AsyncMountingComponent>
		</div>,
		document.body,
	) as unknown as Promise<HTMLElement>;

	Assert.is(document.body.innerHTML, "<div></div>");
	Assert.instance(result2, Promise);
	AsyncComponent.resolves[0]();
	Assert.is(
		(await result1).outerHTML,
		"<div><span>Async Component</span></div>",
	);
	await hangs(result2);
	Assert.is(document.body.innerHTML, "<div><span>Async Component</span></div>");

	AsyncMountingComponent.resolves[0]();
	await new Promise((resolve) => setTimeout(resolve));

	Assert.is(
		document.body.innerHTML,
		"<div><span>Scheduling Component</span></div>",
	);

	Assert.is(await result2, document.body.firstChild);
});

test("async mount replacing async component fallback that is pending and doesn't resolve", async () => {
	// Use AsyncComponent that never resolves by not calling its resolve
	const result1 = renderer.render(
		<div>
			<AsyncComponent>
				<span>Async Component</span>
			</AsyncComponent>
		</div>,
		document.body,
	) as unknown as Promise<HTMLElement>;

	Assert.instance(result1, Promise);
	Assert.is(document.body.innerHTML, "");
	const result2 = renderer.render(
		<div>
			<AsyncMountingComponent>
				<span>Scheduling Component</span>
			</AsyncMountingComponent>
		</div>,
		document.body,
	) as unknown as Promise<HTMLElement>;

	Assert.is(document.body.innerHTML, "<div></div>");
	Assert.instance(result2, Promise);
	await hangs(result1);
	await hangs(result2);
	Assert.is(document.body.innerHTML, "<div></div>");

	AsyncMountingComponent.resolves[0]();
	Assert.is(
		(await result2).outerHTML,
		"<div><span>Scheduling Component</span></div>",
	);

	Assert.is(
		(await result1).outerHTML,
		"<div><span>Scheduling Component</span></div>",
	);

	Assert.is(await result1, document.body.firstChild);
	Assert.is(await result2, document.body.firstChild);
});

test("async mount replacing async tree", async () => {
	const result1 = renderer.render(
		<div>
			<span>
				<AsyncComponent>Async Component</AsyncComponent>
			</span>
		</div>,
		document.body,
	) as Promise<HTMLElement>;

	Assert.instance(result1, Promise);
	Assert.is(document.body.innerHTML, "");
	const result2 = renderer.render(
		<div>
			<AsyncMountingComponent>
				<span>Scheduling Component</span>
			</AsyncMountingComponent>
		</div>,
		document.body,
	) as Promise<HTMLElement>;

	Assert.is(document.body.innerHTML, "<div></div>");
	Assert.instance(result2, Promise);
	AsyncComponent.resolves[0]();
	Assert.is(
		(await result1).outerHTML,
		"<div><span>Async Component</span></div>",
	);
	AsyncMountingComponent.resolves[0]();
	Assert.is(
		(await result2).outerHTML,
		"<div><span>Scheduling Component</span></div>",
	);
});

test("async mount replacing multiple async fallbacks", async () => {
	const result1 = renderer.render(
		<div>
			<span>
				<AsyncComponent>Render 1</AsyncComponent>
			</span>
		</div>,
		document.body,
	) as Promise<HTMLElement>;

	const result2 = renderer.render(
		<div>
			<AsyncComponent>
				<span>Render 2</span>
			</AsyncComponent>
		</div>,
		document.body,
	) as Promise<HTMLElement>;

	const result3 = renderer.render(
		<div>
			<Fragment>
				<span>
					<AsyncComponent>Render 3</AsyncComponent>
				</span>
			</Fragment>
		</div>,
		document.body,
	) as Promise<HTMLElement>;

	const result4 = renderer.render(
		<div>
			<AsyncMountingComponent>
				<span>Scheduling Component</span>
			</AsyncMountingComponent>
		</div>,
		document.body,
	) as Promise<HTMLElement>;

	Assert.instance(result1, Promise);
	Assert.instance(result2, Promise);
	Assert.instance(result3, Promise);
	Assert.instance(result4, Promise);
	Assert.is(document.body.innerHTML, "<div></div>");
	Assert.is(AsyncComponent.resolves.length, 3);
	AsyncComponent.resolves[1]();
	Assert.is((await result1).outerHTML, "<div><span>Render 2</span></div>");
	Assert.is((await result2).outerHTML, "<div><span>Render 2</span></div>");
	await hangs(result3);
	Assert.is(document.body.innerHTML, "<div><span>Render 2</span></div>");
	AsyncMountingComponent.resolves[0]();
	Assert.is(
		(await result3).outerHTML,
		"<div><span>Scheduling Component</span></div>",
	);
	Assert.is(
		(await result4).outerHTML,
		"<div><span>Scheduling Component</span></div>",
	);
});

test("async mount replacing stateful component", async () => {
	let statefulCtx: Context;
	function* StatefulComponent(this: Context): Generator<Element> {
		statefulCtx = this;
		let i = 0;
		for ({} of this) {
			yield <span>Stateful {i++}</span>;
		}
	}

	// Initial render with stateful component
	renderer.render(
		<div>
			<div>
				<StatefulComponent />
			</div>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><div><span>Stateful 0</span></div></div>",
	);

	// Replace with async component - should show nothing while scheduling
	const result2 = renderer.render(
		<div>
			<AsyncMountingComponent>
				<span>Scheduling Component</span>
			</AsyncMountingComponent>
		</div>,
		document.body,
	) as Promise<HTMLElement>;
	Assert.is(
		document.body.innerHTML,
		"<div><div><span>Stateful 0</span></div></div>",
	);
	await hangs(result2);
	statefulCtx!.refresh();
	Assert.is(
		document.body.innerHTML,
		"<div><div><span>Stateful 1</span></div></div>",
	);
	statefulCtx!.refresh();
	Assert.is(
		document.body.innerHTML,
		"<div><div><span>Stateful 2</span></div></div>",
	);

	AsyncMountingComponent.resolves[0]();
	Assert.is(
		(await result2).outerHTML,
		"<div><span>Scheduling Component</span></div>",
	);
});

test("hanging schedule causes commits to queue", async () => {
	// Initial render with hanging schedule - defers mounting
	const result1 = renderer.render(
		<div>
			<AsyncMountingComponent>
				<span>First</span>
			</AsyncMountingComponent>
		</div>,
		document.body,
	) as Promise<HTMLElement>;

	Assert.instance(result1, Promise);
	Assert.is(document.body.innerHTML, "<div></div>"); // Should be empty while scheduling
	await hangs(result1); // Confirm it's hanging

	// Second render - completes synchronously (non-initial render ignores schedule)
	const result2 = renderer.render(
		<div>
			<AsyncMountingComponent>
				<span>Second</span>
			</AsyncMountingComponent>
		</div>,
		document.body,
	) as Promise<HTMLElement>;

	// Should complete synchronously, not return a promise
	Assert.instance(result2, Promise);
	await hangs(result2);
	Assert.is(document.body.innerHTML, "<div></div>"); // Should still be empty
	AsyncMountingComponent.resolves[0](); // Resolve the initial hanging schedule

	Assert.is((await result1).outerHTML, "<div><span>First</span></div>"); // Should render first component
	Assert.is((await result2).outerHTML, "<div><span>Second</span></div>"); // Should render second component
});

test("schedule refresh with an async component", async () => {
	function* Component(this: Context) {
		for ({} of this) {
			this.schedule(() => this.refresh());
			yield <span>Render 1</span>;
			yield (
				<AsyncComponent>
					<span>Render 2</span>
				</AsyncComponent>
			);
		}
	}
	const result1 = renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	) as Promise<HTMLElement>;
	await hangs(result1);
	AsyncComponent.resolves[0]();
	Assert.is((await result1).outerHTML, "<div><span>Render 2</span></div>");
});

test.run();
