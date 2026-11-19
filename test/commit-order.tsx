import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";

import {createElement} from "../src/crank.js";
import type {Children, Context} from "../src/crank.js";
import {renderer} from "../src/dom.js";

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function Delay({
	ms,
	children,
}: {
	ms: number;
	children?: Children;
}): Promise<Children> {
	await delay(ms);
	return children;
}

// The commit follows the diff in document order, so the nodes before an async
// component are created before the component settles. None of it is visible
// until the root is committed.
describe("commit order", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("nothing is inserted until the first render is complete", async () => {
		const refs: Array<string> = [];
		const p = renderer.render(
			<div>
				<h1 ref={(el: Element) => refs.push(el.tagName)}>Title</h1>
				<Delay ms={50}>
					<span ref={(el: Element) => refs.push(el.tagName)}>slow</span>
				</Delay>
			</div>,
			document.body,
		);

		await delay(10);
		expect(document.body.innerHTML).toBe("");
		await p;
		expect(document.body.innerHTML).toBe(
			"<div><h1>Title</h1><span>slow</span></div>",
		);
		expect(refs).toEqual(["H1", "SPAN"]);
	});

	test("updates to a committed root are not committed in parts", async () => {
		const tree = (title: string, ms: number) => (
			<div>
				<h1 class={title}>{title}</h1>
				<Delay ms={ms}>
					<span>{title}</span>
				</Delay>
			</div>
		);

		await renderer.render(tree("one", 1), document.body);
		expect(document.body.innerHTML).toBe(
			'<div><h1 class="one">one</h1><span>one</span></div>',
		);
		const p = renderer.render(tree("two", 50), document.body);
		await delay(10);
		expect(document.body.innerHTML).toBe(
			'<div><h1 class="one">one</h1><span>one</span></div>',
		);
		await p;
		expect(document.body.innerHTML).toBe(
			'<div><h1 class="two">two</h1><span>two</span></div>',
		);
	});

	test("a component refreshes while the first render waits on a sibling", async () => {
		const after: Array<boolean> = [];
		let refresh!: () => unknown;
		function* Counter(this: Context): Generator<Children> {
			let i = 0;
			refresh = () => this.refresh(() => i++);
			this.after((el) => after.push(document.contains(el as Node)));
			for ({} of this) {
				yield <span>{i}</span>;
			}
		}

		const p = renderer.render(
			<div>
				<p>
					<Counter />
				</p>
				<Delay ms={50}>
					<b>slow</b>
				</Delay>
			</div>,
			document.body,
		);

		await delay(10);
		refresh();
		expect(document.body.innerHTML).toBe("");
		expect(after).toEqual([]);
		await p;
		expect(document.body.innerHTML).toBe(
			"<div><p><span>1</span></p><b>slow</b></div>",
		);
		expect(after).toEqual([true]);
		refresh();
		expect(document.body.innerHTML).toBe(
			"<div><p><span>2</span></p><b>slow</b></div>",
		);
	});

	test("a later render replaces a first render which is waiting", async () => {
		const p1 = renderer.render(
			<div>
				<h1>one</h1>
				<Delay ms={1000}>
					<span>never</span>
				</Delay>
			</div>,
			document.body,
		);
		const p2 = renderer.render(
			<div>
				<h1>two</h1>
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div><h1>two</h1></div>");
		await Promise.all([p1, p2]);
		expect(document.body.innerHTML).toBe("<div><h1>two</h1></div>");
	});
});
