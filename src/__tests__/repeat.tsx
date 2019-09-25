/* @jsx createElement */
import "core-js";
import {createElement, Element, render} from "@repeaterjs/repeat";

describe("crank", () => {
	test("render", () => {
		render(
			<div>
				<h1>Hi</h1>
				<h2>Hello</h2>
				<a>Example</a>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><h1>Hi</h1><h2>Hello</h2><a>Example</a></div>",
		);
		render(
			<div>
				<h2>Goodbye</h2>
				<a href="http://www.example.com">Example</a>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			'<div><h2>Goodbye</h2><a href="http://www.example.com">Example</a></div>',
		);
		render(
			<div>
				<h1>Hi</h1>
				<h2>Hello</h2>
				<a href="http://www.example.com">Example</a>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			'<div><h1>Hi</h1><h2>Hello</h2><a href="http://www.example.com">Example</a></div>',
		);
	});
});
