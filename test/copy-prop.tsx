import {suite} from "uvu";
import * as Assert from "uvu/assert";

import {createElement, Context} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("copy-prop");

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("host", () => {
	renderer.render(<div copy={true}>Hello world</div>, document.body);

	Assert.is(document.body.innerHTML, "<div>Hello world</div>");

	renderer.render(
		<div copy={true} style="background-color: red">
			Hello again
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div>Hello world</div>");
});

test("component", () => {
	function Greeting({name}: any) {
		return <div>Hello {name}</div>;
	}

	renderer.render(<Greeting copy={true} name="world" />, document.body);

	Assert.is(document.body.innerHTML, "<div>Hello world</div>");

	renderer.render(<Greeting copy={true} name="Alice" />, document.body);

	Assert.is(document.body.innerHTML, "<div>Hello world</div>");

	renderer.render(<Greeting copy={false} name="Bob" />, document.body);

	Assert.is(document.body.innerHTML, "<div>Hello Bob</div>");
});

test("component refresh", () => {
	let ctx!: Context;
	function Greeting(this: Context, {name}: any) {
		ctx = this;
		return <div>Hello {name}</div>;
	}

	renderer.render(<Greeting copy={true} name="world" />, document.body);

	Assert.is(document.body.innerHTML, "<div>Hello world</div>");

	renderer.render(<Greeting copy={true} name="Alice" />, document.body);

	Assert.is(document.body.innerHTML, "<div>Hello world</div>");

	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div>Hello Alice</div>");
});

test("async component", async () => {
	async function Greeting({name}: any) {
		await new Promise((resolve) => setTimeout(resolve));
		return <div>Hello {name}</div>;
	}

	await renderer.render(<Greeting copy={true} name="world" />, document.body);

	Assert.is(document.body.innerHTML, "<div>Hello world</div>");
	const p1 = renderer.render(
		<Greeting copy={true} name="Alice" />,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div>Hello world</div>");
	await p1;
	Assert.is(document.body.innerHTML, "<div>Hello world</div>");

	const p2 = renderer.render(
		<Greeting copy={false} name="Bob" />,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div>Hello world</div>");
	await p2;
	Assert.is(document.body.innerHTML, "<div>Hello Bob</div>");
});

test("async component refresh", async () => {
	let ctx!: Context;
	async function Greeting(this: Context, {name}: any) {
		ctx = this;
		await new Promise((resolve) => setTimeout(resolve));
		return <div>Hello {name}</div>;
	}

	await renderer.render(<Greeting copy={true} name="world" />, document.body);

	Assert.is(document.body.innerHTML, "<div>Hello world</div>");
	const p1 = renderer.render(
		<Greeting copy={true} name="Alice" />,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div>Hello world</div>");
	await p1;
	Assert.is(document.body.innerHTML, "<div>Hello world</div>");

	const p2 = ctx.refresh();
	Assert.is(document.body.innerHTML, "<div>Hello world</div>");
	await p2;
	Assert.is(document.body.innerHTML, "<div>Hello Alice</div>");
});

test("inflight", async () => {
	let resolve!: () => void;
	async function Greeting(this: Context, {name}: any) {
		await new Promise<void>((resolve1) => (resolve = resolve1));
		return <div>Hello {name}</div>;
	}

	const p1 = renderer.render(<Greeting name="world" />, document.body);

	const p2 = renderer.render(
		<Greeting copy={true} name="Alice" />,
		document.body,
	);

	Assert.is(
		await Promise.race([
			p1,
			p2,
			new Promise((resolve) => setTimeout(() => resolve("timeout"), 20)),
		]),
		"timeout",
	);

	resolve();
	Assert.is(await p1, await p2);
});

test("generator component", async () => {
	let ctx!: Context;
	function* Greeting(this: Context, {name}: {name: string}) {
		ctx = this;
		let i = 0;
		for ({name} of this) {
			yield (
				<div>
					Hello {name} {i++}
				</div>
			);
		}
	}

	renderer.render(<Greeting copy={true} name="world" />, document.body);

	Assert.is(document.body.innerHTML, "<div>Hello world 0</div>");

	renderer.render(<Greeting copy={true} name="Alice" />, document.body);

	Assert.is(document.body.innerHTML, "<div>Hello world 0</div>");

	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div>Hello Alice 1</div>");
});

test("isolate higher-order component", () => {
	function isolate(Component: any) {
		return function Wrapper(props: any) {
			return <Component {...props} copy={true} />;
		};
	}

	let ctx!: Context;
	function* Greeting(this: Context, {name}: any) {
		ctx = this;
		let i = 0;
		for ({name} of this) {
			yield (
				<div>
					Hello {name} {i++}
				</div>
			);
		}
	}

	const IsolatedGreeting = isolate(Greeting);

	renderer.render(<IsolatedGreeting name="world" />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello world 0</div>");

	renderer.render(<IsolatedGreeting name="Alice" />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello world 0</div>");

	renderer.render(<IsolatedGreeting name="Bob" />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello world 0</div>");

	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div>Hello Bob 1</div>");
});

test("tag change", () => {
	renderer.render(<div copy={true}>Hello world</div>, document.body);
	renderer.render(<span copy={true}>Hello world</span>, document.body);
	Assert.is(document.body.innerHTML, "<span>Hello world</span>");
});

test.run();
