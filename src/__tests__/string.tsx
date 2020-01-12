/** @jsx createElement */
import {createElement, Fragment} from "../crank";
import {renderToString} from "../string";

describe("render", () => {
	test("simple", () => {
		expect(renderToString(<h1>Hello world</h1>)).toEqual(
			"<h1>Hello world</h1>",
		);
	});

	test("multiple children", () => {
		expect(
			renderToString(
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
			renderToString(
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
			renderToString(
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
			renderToString(
				<Fragment>
					<input id="toggle" type="checkbox" checked data-checked />
					<label for="toggle" />
				</Fragment>,
			),
		).toEqual(
			'<input id="toggle" type="checkbox" checked data-checked><label for="toggle"></label>',
		);
	});

	test("null", () => {
		expect(renderToString(null)).toEqual("");
	});

	test("fragment", () => {
		expect(
			renderToString(
				<Fragment>
					<span>1</span>
					<span>2</span>
				</Fragment>,
			),
		).toEqual("<span>1</span><span>2</span>");
	});

	test("array", () => {
		expect(
			renderToString(
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
			renderToString(
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
			renderToString(
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
});
