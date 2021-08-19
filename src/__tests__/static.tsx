/// <ref lib="dom" />
/** @jsx createElement */
import {createElement, Context} from "../index";
import {renderer} from "../dom";

describe("static", () => {
	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("host", () => {
		renderer.render(<div crank-static={true}>Hello world</div>, document.body);

		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");

		renderer.render(
			<div crank-static={true} style="background-color: red">
				Hello again
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
	});

	test("component", () => {
		function Greeting({name}: any) {
			return <div>Hello {name}</div>;
		}

		renderer.render(
			<Greeting crank-static={true} name="world" />,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");

		renderer.render(
			<Greeting crank-static={true} name="Alice" />,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");

		renderer.render(
			<Greeting crank-static={false} name="Bob" />,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div>Hello Bob</div>");
	});

	test("component refresh", () => {
		let ctx!: Context;
		function Greeting(this: Context, {name}: any) {
			ctx = this;
			return <div>Hello {name}</div>;
		}

		renderer.render(
			<Greeting crank-static={true} name="world" />,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");

		renderer.render(
			<Greeting crank-static={true} name="Alice" />,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");

		ctx.refresh();
		expect(document.body.innerHTML).toEqual("<div>Hello Alice</div>");
	});

	test("async component", async () => {
		async function Greeting({name}: any) {
			await new Promise((resolve) => setTimeout(resolve));
			return <div>Hello {name}</div>;
		}

		await renderer.render(
			<Greeting crank-static={true} name="world" />,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
		const p1 = renderer.render(
			<Greeting crank-static={true} name="Alice" />,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
		await p1;
		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");

		const p2 = renderer.render(
			<Greeting crank-static={false} name="Bob" />,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
		await p2;
		expect(document.body.innerHTML).toEqual("<div>Hello Bob</div>");
	});

	test("async component refresh", async () => {
		let ctx!: Context;
		async function Greeting(this: Context, {name}: any) {
			ctx = this;
			await new Promise((resolve) => setTimeout(resolve));
			return <div>Hello {name}</div>;
		}

		await renderer.render(
			<Greeting crank-static={true} name="world" />,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
		const p1 = renderer.render(
			<Greeting crank-static={true} name="Alice" />,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
		await p1;
		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");

		const p2 = ctx.refresh();
		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
		await p2;
		expect(document.body.innerHTML).toEqual("<div>Hello Alice</div>");
	});

	test("inflight", async () => {
		let resolve!: () => void;
		async function Greeting(this: Context, {name}: any) {
			await new Promise<void>((resolve1) => (resolve = resolve1));
			return <div>Hello {name}</div>;
		}

		const p1 = renderer.render(<Greeting name="world" />, document.body);

		const p2 = renderer.render(
			<Greeting crank-static={true} name="Alice" />,
			document.body,
		);

		expect(
			await Promise.race([
				p1,
				p2,
				new Promise((resolve) => setTimeout(() => resolve("timeout"), 20)),
			]),
		).toEqual("timeout");

		resolve();
		expect(await p1).toEqual(await p2);
	});

	test("generator component", async () => {
		let ctx!: Context;
		function* Greeting(this: Context, {name}: any) {
			ctx = this;
			let i = 0;
			for ({name} of this) {
				yield (
					<div>
						Hello {name} {i++}
					</div>
				);
			}
		}

		renderer.render(
			<Greeting crank-static={true} name="world" />,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div>Hello world 0</div>");

		renderer.render(
			<Greeting crank-static={true} name="Alice" />,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div>Hello world 0</div>");

		ctx.refresh();
		expect(document.body.innerHTML).toEqual("<div>Hello Alice 1</div>");
	});

	test("isolate higher-order component", () => {
		function isolate(Component: any) {
			return function Wrapper(props: any) {
				return <Component {...props} crank-static={true} />;
			};
		}

		let ctx!: Context;
		function* Greeting(this: Context, {name}: any) {
			ctx = this;
			let i = 0;
			for ({name} of this) {
				yield (
					<div>
						Hello {name} {i++}
					</div>
				);
			}
		}

		const IsolatedGreeting = isolate(Greeting);

		renderer.render(<IsolatedGreeting name="world" />, document.body);
		expect(document.body.innerHTML).toEqual("<div>Hello world 0</div>");

		renderer.render(<IsolatedGreeting name="Alice" />, document.body);
		expect(document.body.innerHTML).toEqual("<div>Hello world 0</div>");

		renderer.render(<IsolatedGreeting name="Bob" />, document.body);
		expect(document.body.innerHTML).toEqual("<div>Hello world 0</div>");

		ctx.refresh();
		expect(document.body.innerHTML).toEqual("<div>Hello Bob 1</div>");
	});
});
