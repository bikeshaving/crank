/// <ref lib="dom" />
import {suite} from "uvu";
import * as Assert from "uvu/assert";
import {createElement, Text} from "../src/crank.js";
import {renderer} from "../src/dom.js";
import * as Sinon from "sinon";

const test = suite("Text");

test("render text element", () => {
	const element = <Text value="Hello, World!" />;
	const root = document.createElement("div");
	renderer.render(element, root);
	Assert.is(root.innerHTML, "Hello, World!");
});

test("component which returns string produces text node", () => {
	function Component({text}: {text: string}) {
		return text;
	}

	const result = renderer.render(
		<Component text="Hello, Crank!" />,
		document.body,
	);

	Assert.instance(result, globalThis.Text);
	Assert.is((result as globalThis.Text).data, "Hello, Crank!");
	Assert.is(document.body.innerHTML, "Hello, Crank!");

	const result1 = renderer.render(
		<Component text="Hello again, Crank!" />,
		document.body,
	);
	Assert.instance(result1, globalThis.Text);
	Assert.is((result1 as globalThis.Text).data, "Hello again, Crank!");
	Assert.is(result, result1);
});

test("component which returns array of strings produces multiple text nodes", () => {
	function Component({children}: {children: Array<string>}) {
		return children;
	}

	const result = renderer.render(
		<Component>{["Hello, ", "Crank!"]}</Component>,
		document.body,
	) as Array<globalThis.Text>;

	Assert.is(document.body.childNodes.length, 2);
	Assert.instance(document.body.childNodes[0], globalThis.Text);
	Assert.is((document.body.childNodes[0] as globalThis.Text).data, "Hello, ");
	Assert.instance(document.body.childNodes[1], globalThis.Text);
	Assert.is((document.body.childNodes[1] as globalThis.Text).data, "Crank!");
	Assert.instance(result, Array);
	Assert.is(result.length, 2);

	Assert.is(result[0], document.body.childNodes[0]);
	Assert.is(result[1], document.body.childNodes[1]);

	const result1 = renderer.render(
		<Component>{["Hello ", "again, ", "Crank!"]}</Component>,
		document.body,
	) as Array<globalThis.Text>;

	Assert.is(document.body.childNodes.length, 3);
	Assert.instance(document.body.childNodes[0], globalThis.Text);
	Assert.is((document.body.childNodes[0] as globalThis.Text).data, "Hello ");
	Assert.instance(document.body.childNodes[1], globalThis.Text);
	Assert.is((document.body.childNodes[1] as globalThis.Text).data, "again, ");
	Assert.instance(document.body.childNodes[2], globalThis.Text);
	Assert.is((document.body.childNodes[2] as globalThis.Text).data, "Crank!");
	Assert.instance(result1, Array);
	Assert.is(result1.length, 3);
	Assert.is(result[0], result1[0]);
	Assert.is(result[1], result1[1]);
	Assert.is(result1[2], document.body.childNodes[2]);
});

test("Text element with ref prop", () => {
	const ref = Sinon.mock();
	const root = document.createElement("div");
	renderer.render(
		<div>
			<Text value="Hello, Ref!" ref={ref} />
		</div>,
		root,
	);
	Assert.is(root.innerHTML, "<div>Hello, Ref!</div>");
	Assert.is(ref.callCount, 1);
	Assert.instance(ref.firstCall.args[0], globalThis.Text);
	Assert.is((ref.firstCall.args[0] as globalThis.Text).data, "Hello, Ref!");
	renderer.render(
		<div>
			<Text value="Hello again, Ref!" ref={ref} />
		</div>,
		root,
	);
	Assert.is(root.innerHTML, "<div>Hello again, Ref!</div>");
	Assert.is(ref.callCount, 1);
});

test.run();
