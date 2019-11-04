/** @jsx createElement */
import "core-js";
import "mutationobserver-shim";
import {createElement, Context, Element, render, View} from "../crank";

describe("render", () => {
	afterEach(() => {
		render(null, document.body);
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

	test("rerender different", () => {
		function Component({Root}: {Root: string}): Element {
			return <Root>Hello world</Root>;
		}
		render(<Component Root="div" />, document.body);
		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
		render(<Component Root="span" />, document.body);
		expect(document.body.innerHTML).toEqual("<span>Hello world</span>");
	});

	test("rerender children", () => {
		render(<div>Loading...</div>, document.body);
		expect(document.body.innerHTML).toEqual("<div>Loading...</div>");
		render(
			<div>
				<span>1</span>
				<span>2</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><span>1</span><span>2</span></div>",
		);
	});

	test("rerender fewer children", () => {
		render(
			<div>
				<span>1</span>
				<span>2</span>
				<span>3</span>
				<span>4</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><span>1</span><span>2</span><span>3</span><span>4</span></div>",
		);
		render(
			<div>
				<span>1</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
	});

	test("render null", () => {
		render(<div>Hello world</div>, document.body);
		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
		render(null, document.body);
		expect(document.body.innerHTML).toEqual("");
		render(<div>Hello again</div>, document.body);
		expect(document.body.innerHTML).toEqual("<div>Hello again</div>");
		render(null, document.body);
		expect(document.body.innerHTML).toEqual("");
	});
});

describe("sync function component", () => {
	afterEach(() => {
		render(null, document.body);
	});

	test("basic", () => {
		function SyncFn({message}: {message: string}): Element {
			return <span>{message}</span>;
		}

		render(
			<div>
				<SyncFn message="Hello" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		render(
			<div>
				<SyncFn message="Goodbye" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Goodbye</span></div>");
	});
});

describe("async function component", () => {
	afterEach(() => {
		render(null, document.body);
	});

	test("basic", async () => {
		async function AsyncFn({
			message,
			time = 100,
		}: {
			message: string;
			time?: number;
		}): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, time));
			return <span>{message}</span>;
		}

		const viewP = render(
			<div>
				<AsyncFn message="Hello" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("");
		await expect(viewP).resolves.toBeInstanceOf(View);
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
	});

	test("rerender", async () => {
		const resolves: ((elem: Element) => void)[] = [];
		function ResolveFn(): Promise<Element> {
			return new Promise((resolve) => resolves.push(resolve));
		}

		render(
			<div>
				<ResolveFn />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("");
		resolves[0](<span>Hello 0</span>);
		expect(document.body.innerHTML).toEqual("");
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.innerHTML).toEqual("<div><span>Hello 0</span></div>");
		render(
			<div>
				<ResolveFn />
			</div>,
			document.body,
		);
		await new Promise((resolve) => setTimeout(resolve, 0));
		resolves[1](<span>Hello 1</span>);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 0</span></div>");
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		expect(resolves.length).toEqual(2);
	});
});

describe("sync generator component", () => {
	afterEach(() => {
		render(null, document.body);
	});

	test("basic", () => {
		const SyncGen = jest.fn(function*(
			this: Context,
			{message}: {message: string},
		): Generator<Element> {
			let i = 0;
			for ({message} of this) {
				i++;
				if (i > 2) {
					return;
				}

				yield <span>{message}</span>;
			}
		});

		render(
			<div>
				<SyncGen message="Hello 1" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		render(
			<div>
				<SyncGen message="Hello 2" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 2</span></div>");
		render(
			<div>
				<SyncGen message="Hello 3" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div></div>");
		expect(SyncGen).toHaveBeenCalledTimes(1);
	});

	test("refresh", () => {
		let refresh!: () => void;
		function* SyncGen(this: Context): Generator<Element> {
			let i = 1;
			refresh = this.refresh.bind(this);
			// eslint-disable-next-line
			for (const _ of this) {
				yield <span>Hello {i++}</span>;
			}
		}

		render(
			<div>
				<SyncGen />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		refresh();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 2</span></div>");
		refresh();
		refresh();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 4</span></div>");
	});
});

describe("async generator component", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		render(null, document.body);
	});

	test("basic", async () => {
		let resolve!: () => unknown;
		const AsyncGen = jest.fn(async function*(
			this: Context,
			{message}: {message: string},
		): AsyncGenerator<Element> {
			for await (const {message} of this) {
				yield <span>Loading</span>;
				await new Promise((resolve1) => (resolve = resolve1));
				yield <span>{message}</span>;
			}
		});

		const viewP = render(
			<div>
				<AsyncGen message="Hello" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("");
		await expect(viewP).resolves.toBeInstanceOf(View);
		expect(document.body.innerHTML).toEqual("<div><span>Loading</span></div>");
		resolve();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		await render(
			<div>
				<AsyncGen message="Goodbye" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Loading</span></div>");
		resolve();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.innerHTML).toEqual("<div><span>Goodbye</span></div>");
		expect(AsyncGen).toHaveBeenCalledTimes(1);
	});

	test("async unmount", async () => {
		let cleanup!: () => unknown;
		async function* Cleanup() {
			try {
				yield <span>Hello</span>;
			} finally {
				await new Promise((resolve) => (cleanup = resolve));
			}
		}

		await render(
			<div>
				<Cleanup />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		render(<div />, document.body);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		cleanup();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.innerHTML).toEqual("<div></div>");
	});
});
