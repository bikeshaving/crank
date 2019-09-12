import {createElement, Element, render} from "../repeat";
const React = {createElement};

describe("repeat", () => {
	test("basic", () => {
		type AProps = {href: string};
		function A({href}: AProps, children: Iterable<Node>): Element<"a"> {
			return <a href={href}>{children}</a>;
		}

		console.log(
			require("util").inspect(
				<div>
					<h1>Hi</h1>
					<h2>Hello</h2>
					<A href="http://www.example.com">Example</A>
				</div>,
				{depth: 1000},
			),
		);
	});

	test("does this actually work", () => {
    const elem = (
      <div>
        <h1>Hi</h1>
        <h2>Hello</h2>
        <a href="http://www.example.com">Example</a>
      </div>
    );
    const container = document.createElement("div");
    render(elem, container);
  });
});
