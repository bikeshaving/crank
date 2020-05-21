/** @jsx createElement */
import {createElement, Fragment, Raw} from "../index";
import {Context} from "../context";
import {renderer} from "../html";

describe("render", () => {
	test("simple", () => {
		expect(renderer.render(<h1>Hello world</h1>)).toEqual(
			"<h1>Hello world</h1>",
		);
	});

	test("multiple children", () => {
		expect(
			renderer.render(
				<div>
					<span>1</span>
					<span>2</span>
					<span>3</span>
					<span>4</span>
				</div>,
			),
		).toEqual(
			"<div><span>1</span><span>2</span><span>3</span><span>4</span></div>",
		);
	});

	test("nested children", () => {
		expect(
			renderer.render(
				<div id="1">
					<div id="2">
						<div id="3">Hi</div>
					</div>
				</div>,
			),
		).toEqual('<div id="1"><div id="2"><div id="3">Hi</div></div></div>');
	});

	test("boolean replaces nested children", () => {
		expect(
			renderer.render(
				<div id="1">
					<div id="2">
						<div id="3">Hi</div>
					</div>
				</div>,
			),
		).toEqual('<div id="1"><div id="2"><div id="3">Hi</div></div></div>');
	});

	test("attrs", () => {
		expect(
			renderer.render(
				<Fragment>
					<input id="toggle" type="checkbox" checked data-checked foo={false} />
					<label for="toggle" />
				</Fragment>,
			),
		).toEqual(
			'<input id="toggle" type="checkbox" checked data-checked><label for="toggle"></label>',
		);
	});

	test("styles", () => {
		expect(
			renderer.render(
				<Fragment>
					<div style={{color: "red"}} />
					<img
						src="x"
						style={{xss: 'foo;" onerror="alert(\'hack\')" other="'}}
					/>
				</Fragment>,
			),
		).toEqual(
			'<div style="color:red;"></div><img src="x" style="xss:foo;&quot; onerror=&quot;alert(&#039;hack&#039;)&quot; other=&quot;;">',
		);
	});

	test("null", () => {
		expect(renderer.render(null)).toEqual("");
	});

	test("fragment", () => {
		expect(
			renderer.render(
				<Fragment>
					<span>1</span>
					<span>2</span>
				</Fragment>,
			),
		).toEqual("<span>1</span><span>2</span>");
	});

	test("array", () => {
		expect(
			renderer.render(
				<div>
					<span>1</span>
					{[<span>2</span>, <span>3</span>]}
					<span>4</span>
				</div>,
			),
		).toEqual(
			"<div><span>1</span><span>2</span><span>3</span><span>4</span></div>",
		);
	});

	test("nested arrays", () => {
		expect(
			renderer.render(
				<div>
					<span>1</span>
					{[<span>2</span>, [<span>3</span>, <span>4</span>], <span>5</span>]}
					<span>6</span>
				</div>,
			),
		).toEqual(
			"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div>",
		);
	});

	test("keyed array", () => {
		const spans = [
			<span crank-key="2">2</span>,
			<span crank-key="3">3</span>,
			<span crank-key="4">4</span>,
		];
		expect(
			renderer.render(
				<div>
					<span>1</span>
					{spans}
					<span>5</span>
				</div>,
			),
		).toEqual(
			"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>",
		);
	});

	test("escaped children", () => {
		expect(renderer.render(<div>{"< > & \" '"}</div>)).toEqual(
			"<div>&lt; &gt; &amp; &quot; &#039;</div>",
		);
	});

	test("raw html", () => {
		const html = '<span id="raw">Hi</span>';
		expect(
			renderer.render(
				<div>
					Raw: <Raw value={html} />
				</div>,
			),
		).toEqual('<div>Raw: <span id="raw">Hi</span></div>');
	});

	test("sync generator components are cleaned up", () => {
		const mock = jest.fn();
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

		expect(renderer.render(<Component />)).toEqual("<div>0</div>");
		expect(renderer.render(<Component />)).toEqual("<div>0</div>");
		expect(mock).toHaveBeenCalledTimes(2);
	});

	test("async generator components are cleaned up", async () => {
		const mock = jest.fn();
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

		await expect(renderer.render(<Component />)).resolves.toEqual(
			"<div>0</div>",
		);
		await expect(renderer.render(<Component />)).resolves.toEqual(
			"<div>0</div>",
		);
		await new Promise((resolve) => setTimeout(resolve));
		expect(mock).toHaveBeenCalledTimes(2);
	});
});
