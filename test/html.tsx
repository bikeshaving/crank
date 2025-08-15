import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

import {Copy, createElement, Fragment, Raw} from "../src/crank.js";
import type {Children, Context} from "../src/crank.js";
import {renderer} from "../src/html.js";

const test = suite("html");

test("simple", () => {
	Assert.is(renderer.render(<h1>Hello world</h1>), "<h1>Hello world</h1>");
});

test("multiple children", () => {
	Assert.is(
		renderer.render(
			<div>
				<span>1</span>
				<span>2</span>
				<span>3</span>
				<span>4</span>
			</div>,
		),
		"<div><span>1</span><span>2</span><span>3</span><span>4</span></div>",
	);
});

test("nested children", () => {
	Assert.is(
		renderer.render(
			<div id="1">
				<div id="2">
					<div id="3">Hi</div>
				</div>
			</div>,
		),
		'<div id="1"><div id="2"><div id="3">Hi</div></div></div>',
	);
});

test("boolean replaces nested children", () => {
	Assert.is(
		renderer.render(
			<div id="1">
				<div id="2">
					<div id="3">Hi</div>
				</div>
			</div>,
		),
		'<div id="1"><div id="2"><div id="3">Hi</div></div></div>',
	);
});

test("attrs", () => {
	Assert.is(
		renderer.render(
			<Fragment>
				<input id="toggle" type="checkbox" checked data-checked foo={false} />
				<label for="toggle" />
			</Fragment>,
		),
		'<input id="toggle" type="checkbox" checked data-checked><label for="toggle"></label>',
	);
});

test("styles", () => {
	Assert.is(
		renderer.render(
			<Fragment>
				<div style={{color: "red"}} />
				<img src="x" style={{xss: 'foo;" onerror="alert(\'hack\')" other="'}} />
			</Fragment>,
		),
		'<div style="color:red;"></div><img src="x" style="xss:foo;&quot; onerror=&quot;alert(&#039;hack&#039;)&quot; other=&quot;;">',
	);
});

test("styles string", () => {
	Assert.is(
		renderer.render(<div style="color: red;" />),
		'<div style="color: red;"></div>',
	);
});

test("styles camelCase", () => {
	Assert.is(
		renderer.render(
			<div
				style={{
					fontSize: "16px",
					backgroundColor: "red",
					marginTop: "10px",
					borderRadius: "4px",
					WebkitTransform: "rotate(45deg)",
				}}
			/>,
		),
		'<div style="font-size:16px;background-color:red;margin-top:10px;border-radius:4px;-webkit-transform:rotate(45deg);"></div>',
	);

	// Test mixed camelCase and kebab-case
	Assert.is(
		renderer.render(
			<div
				style={{fontSize: "16px", "background-color": "blue", marginTop: "5px"}}
			/>,
		),
		'<div style="font-size:16px;background-color:blue;margin-top:5px;"></div>',
	);
});

test("styles numeric values with px conversion", () => {
	Assert.is(
		renderer.render(
			<div
				style={{
					width: 100,
					height: 200,
					opacity: 0.5,
					zIndex: 10,
					fontSize: 16,
				}}
			/>,
		),
		'<div style="width:100px;height:200px;opacity:0.5;z-index:10;font-size:16px;"></div>',
	);
});

test("class and className", () => {
	Assert.is(
		renderer.render(
			<Fragment>
				<div class="class1 class2" />
				<div className="class1 class2" />
				<div className="hidden" class="override" />
				<div class="override" className="hidden" />
				<div className={null} />
				<div class={undefined} />
			</Fragment>,
		),
		'<div class="class1 class2"></div><div class="class1 class2"></div><div class="override"></div><div class="override"></div><div></div><div></div>',
	);
});

test("null", () => {
	Assert.is(renderer.render(null), "");
});

test("callbacks are not rendered", () => {
	Assert.is(
		renderer.render(
			<div
				onclick={() => {
					// do nothing
				}}
			/>,
		),
		"<div></div>",
	);
});

test("fragment", () => {
	Assert.is(
		renderer.render(
			<Fragment>
				<span>1</span>
				<span>2</span>
			</Fragment>,
		),
		"<span>1</span><span>2</span>",
	);
});

test("array", () => {
	Assert.is(
		renderer.render(
			<div>
				<span>1</span>
				{[<span>2</span>, <span>3</span>]}
				<span>4</span>
			</div>,
		),
		"<div><span>1</span><span>2</span><span>3</span><span>4</span></div>",
	);
});

test("nested arrays", () => {
	Assert.is(
		renderer.render(
			<div>
				<span>1</span>
				{[<span>2</span>, [<span>3</span>, <span>4</span>], <span>5</span>]}
				<span>6</span>
			</div>,
		),
		"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div>",
	);
});

test("keyed array", () => {
	const spans = [
		<span key="2">2</span>,
		<span key="3">3</span>,
		<span key="4">4</span>,
	];
	Assert.is(
		renderer.render(
			<div>
				<span>1</span>
				{spans}
				<span>5</span>
			</div>,
		),

		"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>",
	);
});

test("escaped text", () => {
	Assert.is(
		renderer.render(<div>{"< > & \" '"}</div>),
		"<div>&lt; &gt; &amp; &quot; &#039;</div>",
	);
});

test("copied escaped text", () => {
	const key = {};
	Assert.is(
		renderer.render(<div>{"< > & \" '"}</div>, key),
		"<div>&lt; &gt; &amp; &quot; &#039;</div>",
	);

	Assert.is(
		renderer.render(
			<div>
				<Copy />
			</div>,
			key,
		),
		"<div>&lt; &gt; &amp; &quot; &#039;</div>",
	);
});

test("raw html", () => {
	const html = '<span id="raw">Hi</span>';
	Assert.is(
		renderer.render(
			<div>
				Raw: <Raw value={html} />
			</div>,
		),
		'<div>Raw: <span id="raw">Hi</span></div>',
	);
});

test("sync generator components are cleaned up", () => {
	const mock = Sinon.fake();
	function* Component() {
		let i = 0;
		try {
			while (true) {
				yield <div>{i++}</div>;
			}
		} finally {
			mock();
		}
	}

	Assert.is(renderer.render(<Component />), "<div>0</div>");
	Assert.is(renderer.render(<Component />), "<div>0</div>");
	Assert.is(mock.callCount, 2);
});

test("async generator components are cleaned up", async () => {
	const mock = Sinon.fake();
	async function* Component(this: Context) {
		let i = 0;
		// TODO: investigate why using a while loop causes renderer.render to
		// resolve to <div>1</div>
		try {
			for await (const _ of this) {
				yield <div>{i++}</div>;
			}
		} finally {
			mock();
		}
	}

	Assert.is(await renderer.render(<Component />), "<div>0</div>");
	Assert.is(await renderer.render(<Component />), "<div>0</div>");
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(mock.callCount, 2);
});

test("stateful", () => {
	const mock = Sinon.fake();
	function* Component() {
		let i = 0;
		try {
			while (true) {
				yield <div>{i++}</div>;
			}
		} finally {
			mock();
		}
	}

	const key = {};
	Assert.is(renderer.render(<Component />, key), "<div>0</div>");
	Assert.is(renderer.render(<Component />, key), "<div>1</div>");
	Assert.is(mock.callCount, 0);
	Assert.is(renderer.render(null, key), "");
	Assert.is(mock.callCount, 1);
});

test("prop: prefix is not rendered", () => {
	Assert.is(renderer.render(<div prop:foo="bar" />), "<div></div>");
});

test("attr: prefix renders correctly", () => {
	renderer.render(<custom-el />, document.body);
	Assert.is(
		renderer.render(<div attr:attr="value" />),
		'<div attr="value"></div>',
	);
});

test("after callback called once", async () => {
	let i = 0;
	const fn = Sinon.fake();
	async function Component(this: Context) {
		this.after(fn);
		return <span>{i++}</span>;
	}

	const result = await renderer.render(
		<div>
			<Component />
		</div>,
	);

	Assert.is(result, "<div><span>0</span></div>");
	Assert.is(fn.callCount, 1);

	const result1 = await renderer.render(
		<div>
			<Component />
		</div>,
	);

	Assert.is(result1, "<div><span>1</span></div>");
	Assert.is(fn.callCount, 2);
});

test("refs work", () => {
	let mock = Sinon.fake();
	renderer.render(<div ref={mock}>Hello world</div>);

	Assert.is(mock.callCount, 1);
	Assert.is(mock.firstCall.args[0], "<div>Hello world</div>");
});

test("schedule allows for re-render", () => {
	function* Child(this: Context, {children}: {children: Children}) {
		for ({children} of this) {
			yield children;
		}
	}

	function* Component(this: Context) {
		for ({} of this) {
			this.schedule(() => this.refresh());
			yield <div>Render 1</div>;
			yield (
				<Child>
					<div>Render 2</div>
				</Child>
			);
		}
	}

	const result = renderer.render(<Component />);
	Assert.is(result, "<div>Render 2</div>");
});

test("schedule with async children on second render", async () => {
	async function Child(this: Context, {children}: {children: Children}) {
		await new Promise((resolve) => setTimeout(resolve, 10));
		return children;
	}

	function* Component(this: Context) {
		for ({} of this) {
			this.schedule(() => this.refresh());
			yield <div>Render 1</div>;
			yield (
				<Child>
					<div>Render 2</div>
				</Child>
			);
		}
	}

	const result = await renderer.render(<Component />);
	Assert.is(result, "<div>Render 2</div>");
});

test.run();
