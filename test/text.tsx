import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
/// <ref lib="dom" />
import {createElement, Text} from "../src/crank.js";
import {renderer} from "../src/dom.js";
import * as Sinon from "sinon";

describe("Text", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("render text element", () => {
		const element = <Text value="Hello, World!" />;
		const root = document.createElement("div");
		renderer.render(element, root);
		expect(root.innerHTML).toBe("Hello, World!");
	});

	test("component which returns string produces text node", () => {
		function Component({text}: {text: string}) {
			return text;
		}

		const result = renderer.render(
			<Component text="Hello, Crank!" />,
			document.body,
		);

		expect(result).toBeInstanceOf(globalThis.Text);
		expect((result as globalThis.Text).data).toBe("Hello, Crank!");
		expect(document.body.innerHTML).toBe("Hello, Crank!");

		const result1 = renderer.render(
			<Component text="Hello again, Crank!" />,
			document.body,
		);
		expect(result1).toBeInstanceOf(globalThis.Text);
		expect((result1 as globalThis.Text).data).toBe("Hello again, Crank!");
		expect(result).toBe(result1);
	});

	test("component which returns array of strings produces multiple text nodes", () => {
		function Component({children}: {children: string[]}) {
			return children;
		}

		const result = renderer.render(
			<Component>{["Hello, ", "Crank!"]}</Component>,
			document.body,
		) as globalThis.Text[];

		expect(document.body.childNodes.length).toBe(2);
		expect(document.body.childNodes[0]).toBeInstanceOf(globalThis.Text);
		expect((document.body.childNodes[0] as globalThis.Text).data).toBe(
			"Hello, ",
		);
		expect(document.body.childNodes[1]).toBeInstanceOf(globalThis.Text);
		expect((document.body.childNodes[1] as globalThis.Text).data).toBe(
			"Crank!",
		);
		expect(result).toBeInstanceOf(Array);
		expect(result.length).toBe(2);

		expect(result[0]).toBe(document.body.childNodes[0]);
		expect(result[1]).toBe(document.body.childNodes[1]);

		const result1 = renderer.render(
			<Component>{["Hello ", "again, ", "Crank!"]}</Component>,
			document.body,
		) as globalThis.Text[];

		expect(document.body.childNodes.length).toBe(3);
		expect(document.body.childNodes[0]).toBeInstanceOf(globalThis.Text);
		expect((document.body.childNodes[0] as globalThis.Text).data).toBe(
			"Hello ",
		);
		expect(document.body.childNodes[1]).toBeInstanceOf(globalThis.Text);
		expect((document.body.childNodes[1] as globalThis.Text).data).toBe(
			"again, ",
		);
		expect(document.body.childNodes[2]).toBeInstanceOf(globalThis.Text);
		expect((document.body.childNodes[2] as globalThis.Text).data).toBe(
			"Crank!",
		);
		expect(result1).toBeInstanceOf(Array);
		expect(result1.length).toBe(3);
		expect(result[0]).toBe(result1[0]);
		expect(result[1]).toBe(result1[1]);
		expect(result1[2]).toBe(document.body.childNodes[2]);
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
		expect(root.innerHTML).toBe("<div>Hello, Ref!</div>");
		expect(ref.callCount).toBe(1);
		expect(ref.firstCall.args[0]).toBeInstanceOf(globalThis.Text);
		expect((ref.firstCall.args[0] as globalThis.Text).data).toBe("Hello, Ref!");
		renderer.render(
			<div>
				<Text value="Hello again, Ref!" ref={ref} />
			</div>,
			root,
		);
		expect(root.innerHTML).toBe("<div>Hello again, Ref!</div>");
		expect(ref.callCount).toBe(1);
	});
});
