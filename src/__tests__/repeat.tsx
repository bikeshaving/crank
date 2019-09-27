/* @jsx createElement */
import "core-js";
import "mutationobserver-shim";
import {createElement, Element, render, RootView} from "../repeat";

describe("render", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	test("simple", () => {
		render(
			<div>
				<h1>Hello world</h1>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><h1>Hello world</h1></div>");
	});

	test("rerender text", () => {
		const observer = new MutationObserver(() => {});
		observer.observe(document.body, {
			childList: true,
			attributes: true,
			characterData: true,
			subtree: true,
		});
		render(
			<div>
				<h1>Hello world</h1>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><h1>Hello world</h1></div>");
		const records1 = observer.takeRecords();
		expect(records1.length).toEqual(1);
		render(
			<div>
				<h1>Hi world</h1>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><h1>Hi world</h1></div>");
		const records2 = observer.takeRecords();
		expect(records2.length).toEqual(1);
		const [record2] = records2;
		expect(record2.type).toEqual("characterData");
		expect(record2.oldValue).toEqual("Hello world");
		// TODO: normalize adjacent text values
		render(
			<div>
				<h1>Hello {3}</h1>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><h1>Hello 3</h1></div>");
		const records3 = observer.takeRecords();
		expect(records3.length).toEqual(1);
		const [record3] = records3;
		expect(record3.type).toEqual("characterData");
		expect(record3.oldValue).toEqual("Hi world");

		observer.disconnect();
	});

	test("rerender intrinsic", () => {
		const observer = new MutationObserver(() => {});
		observer.observe(document.body, {
			childList: true,
			attributes: true,
			characterData: true,
			subtree: true,
		});
		render(
			<div>
				<h1>Hello world</h1>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><h1>Hello world</h1></div>");
		const records1 = observer.takeRecords();
		expect(records1.length).toEqual(1);
		render(
			<div>
				<h2>Hello world</h2>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><h2>Hello world</h2></div>");
		const records2 = observer.takeRecords();
		expect(records2.length).toEqual(2);
		const [added, removed] = records2;
		expect(added.type).toEqual("childList");
		expect(added.addedNodes.length).toEqual(1);
		expect(removed.type).toEqual("childList");
		expect(removed.removedNodes.length).toEqual(1);
		observer.disconnect();
	});
});

describe("components", () => {
	function SyncComponent(): Element {
		return <span>Sync Component</span>;
	}

	async function AsyncComponent(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return <span>Async Component</span>;
	}

	afterEach(() => {
		document.body.innerHTML = "";
	});

	test("sync function", () => {
		const view = render(
			<div>
				<SyncComponent />
			</div>,
			document.body,
		);
		expect(view).toBeInstanceOf(RootView);
		expect(document.body.innerHTML).toEqual(
			"<div><span>Sync Component</span></div>",
		);
	});

	test("async function", async () => {
		const viewP = render(
			<div>
				<AsyncComponent />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("");
		await expect(viewP).resolves.toBeInstanceOf(RootView);
		expect(document.body.innerHTML).toEqual(
			"<div><span>Async Component</span></div>",
		);
	});
});
