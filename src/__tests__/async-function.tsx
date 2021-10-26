import {createElement, Element} from "../crank.js";
import {renderer} from "../dom.js";

describe("async function component", () => {
	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("basic", async () => {
		async function Component({message}: {message: string}): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 100));
			return <span>{message}</span>;
		}

		const p = renderer.render(
			<div>
				<Component message="Hello" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("");
		expect(await p).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
	});

	test("updates enqueue", async () => {
		const fn = jest.fn();
		async function Component({message}: {message: string}): Promise<Element> {
			fn();
			await new Promise((resolve) => setTimeout(resolve, 25));
			return <span>{message}</span>;
		}

		const p1 = renderer.render(
			<div>
				<Component message="Hello 1" />
			</div>,
			document.body,
		);
		const p2 = renderer.render(
			<div>
				<Component message="Hello 2" />
			</div>,
			document.body,
		);
		const p3 = renderer.render(
			<div>
				<Component message="Hello 3" />
			</div>,
			document.body,
		);
		const p4 = renderer.render(
			<div>
				<Component message="Hello 4" />
			</div>,
			document.body,
		);
		const p5 = renderer.render(
			<div>
				<Component message="Hello 5" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("");
		expect(await p1).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		expect(await p2).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 5</span></div>");
		expect(await p3).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 5</span></div>");
		expect(await p4).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 5</span></div>");
		const p6 = renderer.render(
			<div>
				<Component message="Hello 6" />
			</div>,
			document.body,
		);
		const p7 = renderer.render(
			<div>
				<Component message="Hello 7" />
			</div>,
			document.body,
		);
		const p8 = renderer.render(
			<div>
				<Component message="Hello 8" />
			</div>,
			document.body,
		);
		const p9 = renderer.render(
			<div>
				<Component message="Hello 9" />
			</div>,
			document.body,
		);
		const p10 = renderer.render(
			<div>
				<Component message="Hello 10" />
			</div>,
			document.body,
		);
		expect(await p5).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 5</span></div>");
		expect(await p6).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 6</span></div>");
		expect(await p7).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 10</span></div>");
		expect(await p8).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 10</span></div>");
		expect(await p9).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 10</span></div>");
		expect(await p10).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 10</span></div>");
		expect(fn).toHaveBeenCalledTimes(4);
	});

	test("update", async () => {
		const resolves: Array<Function> = [];
		async function Component({message}: {message: string}): Promise<Element> {
			await new Promise((resolve) => resolves.push(resolve));
			return <span>{message}</span>;
		}

		let p = renderer.render(
			<div>
				<Component message="Hello 1" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("");
		resolves[0]();
		await p;
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		p = renderer.render(
			<div>
				<Component message="Hello 2" />
			</div>,
			document.body,
		);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		resolves[1]();
		await p;
		expect(document.body.innerHTML).toEqual("<div><span>Hello 2</span></div>");
		expect(resolves.length).toEqual(2);
	});

	test("out of order", async () => {
		async function Component({
			message,
			delay,
		}: {
			message: string;
			delay: number;
		}): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, delay));
			return <span>{message}</span>;
		}

		const p1 = renderer.render(
			<div>
				<Component message="Hello 1" delay={100} />
			</div>,
			document.body,
		);
		const p2 = renderer.render(
			<div>
				<Component message="Hello 2" delay={0} />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("");
		await p1;
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		await p2;
		expect(document.body.innerHTML).toEqual("<div><span>Hello 2</span></div>");
	});

	test("async children enqueue", async () => {
		const Child = jest.fn(async function Child({
			message,
		}: {
			message: string;
		}): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 100));
			return <div>{message}</div>;
		});

		async function Parent({message}: {message: string}): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 50));
			return <Child message={message} />;
		}

		const p1 = renderer.render(<Parent message="Hello 1" />, document.body);
		const p2 = renderer.render(<Parent message="Hello 2" />, document.body);
		const p3 = renderer.render(<Parent message="Hello 3" />, document.body);
		const p4 = renderer.render(<Parent message="Hello 4" />, document.body);
		expect(await p1).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div>Hello 1</div>");
		expect(await p2).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div>Hello 4</div>");
		expect(await p3).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div>Hello 4</div>");
		const p5 = renderer.render(<Parent message="Hello 5" />, document.body);
		const p6 = renderer.render(<Parent message="Hello 6" />, document.body);
		const p7 = renderer.render(<Parent message="Hello 7" />, document.body);
		const p8 = renderer.render(<Parent message="Hello 8" />, document.body);
		expect(await p4).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div>Hello 4</div>");
		expect(await p5).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div>Hello 5</div>");
		expect(await p6).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div>Hello 8</div>");
		expect(await p7).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div>Hello 8</div>");
		expect(await p8).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toEqual("<div>Hello 8</div>");
		expect(Child).toHaveBeenCalledTimes(4);
	});
});
