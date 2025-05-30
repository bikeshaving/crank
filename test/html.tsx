import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

import {Context, Copy, createElement, Fragment, Raw} from "../src/crank.js";
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

test.run();
