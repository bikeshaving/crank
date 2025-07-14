import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

import {
	createElement,
	Child,
	Children,
	Context,
	Element,
	Fragment,
} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("async generator");
test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("basic", async () => {
	const Component = Sinon.fake(async function* Component(
		this: Context,
		{message}: {message: string},
	): AsyncGenerator<Element> {
		let i = 0;
		for await ({message} of this) {
			if (i >= 2) {
				return <span>Final</span>;
			}

			yield <span>{message}</span>;
			i++;
		}
	});

	await renderer.render(
		<div>
			<Component message="Hello 1" />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Hello 1</span></div>");
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(document.body.innerHTML, "<div><span>Hello 1</span></div>");
	await renderer.render(
		<div>
			<Component message="Hello 2" />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Hello 2</span></div>");
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(document.body.innerHTML, "<div><span>Hello 2</span></div>");
	await renderer.render(
		<div>
			<Component message="Hello 3" />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Final</span></div>");
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(document.body.innerHTML, "<div><span>Final</span></div>");
	Assert.is(Component.callCount, 1);
});

test("multiple yields per update", async () => {
	let resolve: undefined | Function;
	async function* Component(
		this: Context,
		{message}: {message: string},
	): AsyncGenerator<Element> {
		for await ({message} of this) {
			yield <span>Loading</span>;
			await new Promise((resolve1) => (resolve = resolve1));
			yield <span>{message}</span>;
		}
	}

	await renderer.render(
		<div>
			<Component message="Hello" />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Loading</span></div>");
	await new Promise((resolve) => setTimeout(resolve));
	resolve!();
	resolve = undefined;
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	await renderer.render(
		<div>
			<Component message="Goodbye" />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Loading</span></div>");
	await new Promise((resolve) => setTimeout(resolve));
	resolve!();
	resolve = undefined;
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(document.body.innerHTML, "<div><span>Goodbye</span></div>");
});

test("multiple yields sync", async () => {
	async function* Component(
		this: Context,
		{message}: {message: string},
	): AsyncGenerator<Element> {
		for await ({message} of this) {
			yield <span>Loading</span>;
			yield <span>{message}</span>;
		}
	}

	const p = renderer.render(
		<div>
			<Component message="Hello" />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "");
	await p;
	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	await renderer.render(
		<div>
			<Component message="Hello" />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
});

test("Fragment parent", async () => {
	let resolve!: Function;
	async function* Component(this: Context) {
		for await (const _ of this) {
			yield 1;
			await new Promise((resolve1) => (resolve = resolve1));
			yield 2;
		}
	}

	await renderer.render(
		<Fragment>
			<Component />
		</Fragment>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "1");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "1");
	resolve();
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "2");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "2");
});

test("for...of yield resumes with elements", async () => {
	let node: HTMLElement | undefined;
	async function* Component(this: Context) {
		let i = 0;
		for ({} of this) {
			node = yield <div id={i}>{i}</div>;
			i++;
		}
	}

	await renderer.render(<Component />, document.body);
	Assert.is(node, undefined);
	await renderer.render(<Component />, document.body);
	Assert.is(node!.outerHTML, '<div id="1">1</div>');
	Assert.is(document.body.innerHTML, '<div id="1">1</div>');
	await renderer.render(<Component />, document.body);
	Assert.is(node!.outerHTML, '<div id="2">2</div>');
	Assert.is(document.body.innerHTML, '<div id="2">2</div>');
});

test("for...of yield resumes with elements with async children", async () => {
	async function Child({id}: {id: number}) {
		await new Promise((resolve) => setTimeout(resolve));
		return <div id={id}>{id}</div>;
	}
	let node: HTMLElement | undefined;
	async function* Component(this: Context) {
		let i = 0;
		for ({} of this) {
			node = yield <Child id={i} />;
			i++;
		}
	}

	await renderer.render(<Component />, document.body);
	Assert.is(node, undefined);
	await renderer.render(<Component />, document.body);
	Assert.is(node!.outerHTML, '<div id="1">1</div>');
	Assert.is(document.body.innerHTML, '<div id="1">1</div>');
	await renderer.render(<Component />, document.body);
	Assert.is(node!.outerHTML, '<div id="2">2</div>');
	Assert.is(document.body.innerHTML, '<div id="2">2</div>');
});
test("for await...of yield resumes with a promise of an element", async () => {
	let nodeP: Promise<HTMLElement> | undefined;
	async function* Component(this: Context) {
		let i = 0;
		for await ({} of this) {
			nodeP = yield <div id={i}>{i}</div>;
			i++;
		}
	}

	await renderer.render(<Component />, document.body);
	let html = (await nodeP!).outerHTML;
	Assert.is(html, '<div id="0">0</div>');
	Assert.is(document.body.innerHTML, '<div id="0">0</div>');
	await renderer.render(<Component />, document.body);
	html = (await nodeP!).outerHTML;
	Assert.is(html, '<div id="1">1</div>');
	Assert.is(document.body.innerHTML, '<div id="1">1</div>');
	await renderer.render(<Component />, document.body);
	html = (await nodeP!).outerHTML;
	Assert.is(html, '<div id="2">2</div>');
	Assert.is(document.body.innerHTML, '<div id="2">2</div>');
});

test("yield resumes async children", async () => {
	const t = Date.now();
	const Async = Sinon.fake(async function Async({
		id,
	}: {
		id: number;
	}): Promise<Child> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return <div id={id}>{id}</div>;
	});

	let html: Promise<string> | undefined;
	async function* Component(this: Context) {
		let i = 0;
		for await (const _ of this) {
			const node: Promise<HTMLElement> = yield <Async id={i} />;
			html = node.then((node: HTMLElement) => node.outerHTML);
			await node;
			i++;
		}
	}

	await renderer.render(<Component />, document.body);
	Assert.is(await html, '<div id="0">0</div>');
	Assert.is(document.body.innerHTML, '<div id="0">0</div>');
	// TODO: Find a better way to test the timings
	Assert.ok(Date.now() - t > 100 - 30 && Date.now() - t < 100 + 30);
	await renderer.render(<Component />, document.body);
	Assert.is(await html, '<div id="1">1</div>');
	Assert.is(document.body.innerHTML, '<div id="1">1</div>');
	Assert.ok(Date.now() - t > 200 - 30 && Date.now() - t < 200 + 30);
	await renderer.render(<Component />, document.body);
	Assert.is(await html, '<div id="2">2</div>');
	Assert.is(document.body.innerHTML, '<div id="2">2</div>');
	Assert.ok(Date.now() - t > 300 - 30 && Date.now() - t < 300 + 30);
	Assert.is(Async.callCount, 3);
});

test("yield before for await loop", async () => {
	async function* Component(this: Context) {
		let i = 0;
		yield <div>{i++}</div>;
		for await (const _ of this) {
			yield <div>{i++}</div>;
		}
	}

	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>0</div>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<div>0</div>");
	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>1</div>");
});

test("concurrent unmount", async () => {
	const mock = Sinon.fake();
	async function* Component(this: Context): AsyncGenerator<Child> {
		try {
			for await ({} of this) {
				yield "Hello world";
			}
		} finally {
			mock();
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	renderer.render(null, document.body);
	Assert.is(document.body.innerHTML, "");
	Assert.is(mock.callCount, 0);
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(document.body.innerHTML, "");
	Assert.is(mock.callCount, 1);
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "");
	Assert.is(mock.callCount, 1);
});

test("async generator returns", async () => {
	const Component = Sinon.fake(async function* Component(
		this: Context,
	): AsyncGenerator<Child> {
		let started = false;
		for await (const _ of this) {
			if (started) {
				return "Goodbye";
			} else {
				yield "Hello";
				started = true;
			}
		}
	});

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div>Hello</div>");
	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div>Goodbye</div>");
	Assert.is(Component.callCount, 1);
	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div>Hello</div>");
	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div>Goodbye</div>");
	Assert.is(Component.callCount, 2);
	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div>Hello</div>");
	Assert.is(Component.callCount, 3);
});

test("try/finally", async () => {
	const mock = Sinon.fake();
	async function* Component(this: Context): AsyncGenerator<Child> {
		try {
			let i = 0;
			for await (const _ of this) {
				yield <div>Hello {i++}</div>;
			}
		} finally {
			mock();
		}
	}

	await renderer.render(<Component />, document.body);
	await renderer.render(<Component />, document.body);
	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello 2</div>");
	Assert.is(mock.callCount, 0);
	renderer.render(<div />, document.body);
	Assert.is(document.body.innerHTML, "<div></div>");
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(mock.callCount, 1);
});

test("for...of", async () => {
	const beforeYieldFn = Sinon.fake();
	const afterYieldFn = Sinon.fake();
	const afterLoopFn = Sinon.fake();
	async function* Component(this: Context) {
		let i = 0;
		for ({} of this) {
			beforeYieldFn();
			yield <div>Hello {i++}</div>;
			afterYieldFn();
		}

		afterLoopFn();
	}

	await renderer.render(<Component />, document.body);
	Assert.is(beforeYieldFn.callCount, 1);
	Assert.is(afterYieldFn.callCount, 0);
	Assert.is(document.body.innerHTML, "<div>Hello 0</div>");
	await renderer.render(<Component />, document.body);
	Assert.is(beforeYieldFn.callCount, 2);
	Assert.is(afterYieldFn.callCount, 1);
	Assert.is(document.body.innerHTML, "<div>Hello 1</div>");

	renderer.render(null, document.body);
	Assert.is(document.body.innerHTML, "");
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(afterLoopFn.callCount, 1);
});

test("for...of delayed", async () => {
	const beforeYieldFn = Sinon.fake();
	const afterYieldFn = Sinon.fake();
	const afterLoopFn = Sinon.fake();
	async function* Component(this: Context) {
		let i = 0;
		await new Promise((resolve) => setTimeout(resolve));
		for ({} of this) {
			beforeYieldFn();
			yield <div>Hello {i++}</div>;
			afterYieldFn();
		}

		afterLoopFn();
	}

	const p = renderer.render(<Component />, document.body);
	Assert.is(beforeYieldFn.callCount, 0);
	Assert.is(afterYieldFn.callCount, 0);
	await p;
	Assert.is(beforeYieldFn.callCount, 1);
	Assert.is(afterYieldFn.callCount, 0);
	Assert.is(document.body.innerHTML, "<div>Hello 0</div>");
	await renderer.render(<Component />, document.body);
	Assert.is(beforeYieldFn.callCount, 2);
	Assert.is(afterYieldFn.callCount, 1);
	Assert.is(document.body.innerHTML, "<div>Hello 1</div>");

	renderer.render(null, document.body);
	Assert.is(document.body.innerHTML, "");
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(afterLoopFn.callCount, 1);
});

test("for...of then for...await of", async () => {
	const beforeYieldFn = Sinon.fake();
	const afterYieldFn = Sinon.fake();
	const afterLoopFn = Sinon.fake();
	async function* Component(this: Context) {
		let i = 0;
		for ({} of this) {
			beforeYieldFn();
			yield <div>for...of {i++}</div>;
			afterYieldFn();
			break;
		}

		afterLoopFn();
		for await ({} of this) {
			beforeYieldFn();
			yield <div>for await...of {i++}</div>;
			// this code executes immediately because we are in a for await...of loop
			afterYieldFn();
			break;
		}

		afterLoopFn();

		for ({} of this) {
			beforeYieldFn();
			yield <div>for...of {i++}</div>;
			afterYieldFn();
			break;
		}

		afterLoopFn();
	}

	await renderer.render(<Component />, document.body);
	Assert.is(beforeYieldFn.callCount, 1);
	Assert.is(afterYieldFn.callCount, 0);
	Assert.is(document.body.innerHTML, "<div>for...of 0</div>");

	await renderer.render(<Component />, document.body);
	Assert.is(afterLoopFn.callCount, 2);
	Assert.is(beforeYieldFn.callCount, 3);
	Assert.is(afterYieldFn.callCount, 2);
	Assert.is(document.body.innerHTML, "<div>for...of 2</div>");

	renderer.render(null, document.body);
	Assert.is(document.body.innerHTML, "");
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(afterLoopFn.callCount, 3);
});

test("for await...of", async () => {
	const beforeYieldFn = Sinon.fake();
	const afterYieldFn = Sinon.fake();
	const afterLoopFn = Sinon.fake();
	async function* Component(this: Context): AsyncGenerator<Child> {
		let i = 0;
		for await (const _ of this) {
			beforeYieldFn();
			yield <div>Hello {i++}</div>;
			afterYieldFn();
		}

		afterLoopFn();
	}

	await renderer.render(<Component />, document.body);
	Assert.is(beforeYieldFn.callCount, 1);
	Assert.is(afterYieldFn.callCount, 1);
	await new Promise((resolve) => setTimeout(resolve, 10));
	Assert.is(beforeYieldFn.callCount, 1);
	Assert.is(afterYieldFn.callCount, 1);
	await renderer.render(<Component />, document.body);
	Assert.is(beforeYieldFn.callCount, 2);
	Assert.is(afterYieldFn.callCount, 2);
	await renderer.render(<Component />, document.body);
	Assert.is(beforeYieldFn.callCount, 3);
	Assert.is(afterYieldFn.callCount, 3);
	Assert.is(document.body.innerHTML, "<div>Hello 2</div>");
	await new Promise((resolve) => setTimeout(resolve, 10));
	Assert.is(beforeYieldFn.callCount, 3);
	Assert.is(afterYieldFn.callCount, 3);
	Assert.is(afterLoopFn.callCount, 0);
	renderer.render(null, document.body);
	Assert.is(document.body.innerHTML, "");
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(afterLoopFn.callCount, 1);
});

test("for await...of with await in loop", async () => {
	const beforeYieldFn = Sinon.fake();
	const afterYieldFn = Sinon.fake();
	const afterLoopFn = Sinon.fake();
	async function* Component(this: Context): AsyncGenerator<Child> {
		let i = 0;
		for await (const _ of this) {
			await new Promise((r) => setTimeout(r, 10));
			beforeYieldFn();
			yield <div>Hello {i++}</div>;
			afterYieldFn();
		}

		afterLoopFn();
	}

	// first render
	await renderer.render(<Component />, document.body);
	Assert.is(beforeYieldFn.callCount, 1);
	Assert.is(afterYieldFn.callCount, 1);
	Assert.is(document.body.innerHTML, "<div>Hello 0</div>");

	// second render
	await renderer.render(<Component />, document.body);
	Assert.is(beforeYieldFn.callCount, 2);
	Assert.is(afterYieldFn.callCount, 2);
	Assert.is(document.body.innerHTML, "<div>Hello 1</div>");

	// third render is interrupted by unmount
	renderer.render(<Component />, document.body);
	await new Promise((resolve) => setTimeout(resolve));
	renderer.render(null, document.body);
	Assert.is(document.body.innerHTML, "");
	Assert.is(afterLoopFn.callCount, 0);
	Assert.is(document.body.innerHTML, "");

	await new Promise((resolve) => setTimeout(resolve, 10));
	Assert.is(afterLoopFn.callCount, 1);
});

test("for await...of with multiple yields", async () => {
	const beforeYieldFn = Sinon.fake();
	const afterYieldFn = Sinon.fake();
	const afterLoopFn = Sinon.fake();
	async function* Component(this: Context): AsyncGenerator<Child> {
		let i = 0;
		for await ({} of this) {
			i++;
			beforeYieldFn();
			yield <div>Hello {i}</div>;
			await new Promise((r) => setTimeout(r, 10));
			yield <div>Goodbye {i}</div>;
			afterYieldFn();
		}

		afterLoopFn();
	}

	// first render
	await renderer.render(<Component />, document.body);
	Assert.is(beforeYieldFn.callCount, 1);
	Assert.is(afterYieldFn.callCount, 0);
	Assert.is(document.body.innerHTML, "<div>Hello 1</div>");
	await new Promise((r) => setTimeout(r, 10));
	Assert.is(beforeYieldFn.callCount, 1);
	Assert.is(afterYieldFn.callCount, 1);
	Assert.is(document.body.innerHTML, "<div>Goodbye 1</div>");

	// second render
	await renderer.render(<Component />, document.body);
	Assert.is(beforeYieldFn.callCount, 2);
	Assert.is(afterYieldFn.callCount, 1);
	Assert.is(document.body.innerHTML, "<div>Hello 2</div>");
	await new Promise((r) => setTimeout(r, 10));
	Assert.is(beforeYieldFn.callCount, 2);
	Assert.is(afterYieldFn.callCount, 2);
	Assert.is(document.body.innerHTML, "<div>Goodbye 2</div>");

	// third render is interrupted by unmount
	renderer.render(<Component />, document.body);
	renderer.render(null, document.body);
	Assert.is(document.body.innerHTML, "");
	Assert.is(afterLoopFn.callCount, 0);
	Assert.is(document.body.innerHTML, "");

	await new Promise((resolve) => setTimeout(resolve, 10));
	Assert.is(afterLoopFn.callCount, 1);
});

test("Context iterator returns on unmount", async () => {
	const mock = Sinon.fake();
	async function* Component(this: Context): AsyncGenerator<Element> {
		let i = 0;
		for await ({} of this) {
			yield <div>Hello {i++}</div>;
		}

		mock();
	}

	await renderer.render(<Component />, document.body);
	await renderer.render(<Component />, document.body);
	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello 2</div>");
	Assert.is(mock.callCount, 0);
	renderer.render(null, document.body);
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(mock.callCount, 1);
});

test("return called when component continues to yield", async () => {
	const mock = Sinon.fake();
	async function* Component(this: Context) {
		let i = 0;
		for await ({} of this) {
			yield <div>Hello {i++}</div>;
		}

		mock();
		yield <div>Exited {i++}</div>;
		mock();
		Assert.unreachable();
	}

	await renderer.render(<Component />, document.body);
	await renderer.render(<Component />, document.body);
	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello 2</div>");
	Assert.is(mock.callCount, 0);
	renderer.render(null, document.body);
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(mock.callCount, 1);
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(mock.callCount, 1);
});

// https://github.com/bikeshaving/crank/pull/121
test("unmount edge case", async () => {
	function Switch({children, active}: {children: Children; active: boolean}) {
		if (!active) {
			return null;
		}

		return children;
	}

	async function* AsyncGen(this: Context) {
		for await (const _ of this) {
			yield <span>true</span>;
		}
	}

	function* Component() {
		let toggle = true;
		while (true) {
			yield (
				<div>
					<Switch active={toggle}>
						<AsyncGen />
					</Switch>
					<Switch active={!toggle}>
						<span>false</span>
					</Switch>
				</div>
			);

			toggle = !toggle;
		}
	}

	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div><span>true</span></div>");
	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div><span>false</span></div>");
	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div><span>true</span></div>");
});

test("multiple iterations without a yield throw", async () => {
	let i = 0;
	async function* Component(this: Context) {
		for await (const _ of this) {
			// just so the test suite doesn’t enter an infinite loop
			if (i > 100) {
				yield;
				return;
			}

			i++;
		}
	}

	try {
		await renderer.render(<Component />, document.body);
		Assert.unreachable();
	} catch (err: any) {
		Assert.is(err.message, "Context iterated twice without a yield");
	}

	Assert.is(i, 1);
});

test("for...of enqueues", async () => {
	const fn = Sinon.fake();
	async function* Component(
		this: Context<typeof Component>,
		{message}: {message: string},
	) {
		for ({message} of this) {
			await new Promise((resolve) => setTimeout(resolve));
			fn();
			yield <span>{message}</span>;
		}
	}

	const p1 = renderer.render(
		<div>
			<Component message="Hello 1" />
		</div>,
		document.body,
	);
	const p2 = renderer.render(
		<div>
			<Component message="Hello 2" />
		</div>,
		document.body,
	);
	const p3 = renderer.render(
		<div>
			<Component message="Hello 3" />
		</div>,
		document.body,
	);
	const p4 = renderer.render(
		<div>
			<Component message="Hello 4" />
		</div>,
		document.body,
	);
	const p5 = renderer.render(
		<div>
			<Component message="Hello 5" />
		</div>,
		document.body,
	);

	Assert.is(await p1, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 1</span></div>");
	Assert.is(await p2, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 5</span></div>");
	Assert.is(await p3, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 5</span></div>");
	Assert.is(await p4, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 5</span></div>");
	const p6 = renderer.render(
		<div>
			<Component message="Hello 6" />
		</div>,
		document.body,
	);
	const p7 = renderer.render(
		<div>
			<Component message="Hello 7" />
		</div>,
		document.body,
	);
	const p8 = renderer.render(
		<div>
			<Component message="Hello 8" />
		</div>,
		document.body,
	);
	const p9 = renderer.render(
		<div>
			<Component message="Hello 9" />
		</div>,
		document.body,
	);
	const p10 = renderer.render(
		<div>
			<Component message="Hello 10" />
		</div>,
		document.body,
	);
	Assert.is(await p5, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 5</span></div>");
	Assert.is(await p6, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 6</span></div>");
	Assert.is(await p7, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 10</span></div>");
	Assert.is(await p8, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 10</span></div>");
	Assert.is(await p9, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 10</span></div>");
	Assert.is(await p10, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 10</span></div>");
	Assert.is(fn.callCount, 4);
});

test("for await...of updates enqueue", async () => {
	const beforeAwaitFn = Sinon.fake();
	async function* Component(this: Context, {callIndex}: {callIndex: number}) {
		let runIndex = 1;
		for await ({callIndex} of this) {
			beforeAwaitFn();
			await new Promise((resolve) => setTimeout(resolve, 25));
			yield (
				<div>
					run {runIndex}, call {callIndex}
				</div>
			);
			runIndex++;
		}
	}

	const p1 = renderer.render(<Component callIndex={1} />, document.body);
	const p2 = renderer.render(<Component callIndex={2} />, document.body);
	const p3 = renderer.render(<Component callIndex={3} />, document.body);
	const p4 = renderer.render(<Component callIndex={4} />, document.body);
	const p5 = renderer.render(<Component callIndex={5} />, document.body);

	Assert.is(await p1, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>run 1, call 1</div>");
	Assert.is(beforeAwaitFn.callCount, 2);
	Assert.is(await p2, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>run 2, call 5</div>");
	Assert.is(await p3, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>run 2, call 5</div>");
	Assert.is(await p4, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>run 2, call 5</div>");

	const p6 = renderer.render(<Component callIndex={6} />, document.body);
	const p7 = renderer.render(<Component callIndex={7} />, document.body);
	const p8 = renderer.render(<Component callIndex={8} />, document.body);
	const p9 = renderer.render(<Component callIndex={9} />, document.body);
	const p10 = renderer.render(<Component callIndex={10} />, document.body);

	Assert.is(await p5, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>run 2, call 5</div>");
	Assert.is(await p6, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>run 3, call 6</div>");
	Assert.is(await p7, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>run 4, call 10</div>");
	Assert.is(await p8, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>run 4, call 10</div>");
	Assert.is(await p9, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>run 4, call 10</div>");
	Assert.is(await p10, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>run 4, call 10</div>");
	Assert.is(beforeAwaitFn.callCount, 4);
});

test("stale renders are skipped", async () => {
	const characterDatas: Array<string> = [];
	const mutationObserver = new MutationObserver((records) => {
		for (const record of records) {
			if (record.type === "characterData") {
				characterDatas.push(record.target.textContent!);
			}
		}
	});

	mutationObserver.observe(document.body, {
		characterData: true,
		subtree: true,
	});
	let resolve: undefined | Function;
	async function* Component(this: Context, {message}: {message: string}) {
		for await ({message} of this) {
			yield <span>{message} before</span>;
			await new Promise((resolve1) => (resolve = resolve1));
			yield <span>{message} after</span>;
		}
	}

	try {
		await renderer.render(<Component message="Hello" />, document.body);
		Assert.is(document.body.innerHTML, "<span>Hello before</span>");
		resolve!();
		await new Promise((resolve) => setTimeout(resolve));
		Assert.is(document.body.innerHTML, "<span>Hello after</span>");
		await renderer.render(<Component message="Hello again" />, document.body);
		Assert.is(document.body.innerHTML, "<span>Hello again before</span>");
		const resolve1 = resolve;
		const p = renderer.render(<Component message="Goodbye" />, document.body);
		resolve1!();
		await p;
		Assert.is(document.body.innerHTML, "<span>Goodbye before</span>");
		Assert.equal(characterDatas, [
			"Hello after",
			"Hello again before",
			"Goodbye before",
		]);
	} finally {
		mutationObserver.disconnect();
	}
});

test.run();
