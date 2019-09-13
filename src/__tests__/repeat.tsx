import {createElement, Element, render} from "../repeat";
const React = {createElement};

describe("repeat", () => {
	test("does this actually work", () => {
		console.log(
			(render(
				<div>
					<h1>Hi</h1>
					<h2>Hello</h2>
					<a href="http://www.example.com">Example</a>
				</div>,
				document.body,
			).node as any).outerHTML,
		);
		console.log(
			(render(
				<div>
					<h2>Hi</h2>
					<a href="http://www.example.com">Example</a>
				</div>,
				document.body,
			).node as any).outerHTML,
		);
		console.log(
			(render(
				<div>
					<h1>Hi</h1>
					<h2>Hello</h2>
					<a href="http://www.example.com">Example</a>
				</div>,
				document.body,
			).node as any).outerHTML,
		);
	});
});
