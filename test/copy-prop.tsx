import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
import * as Sinon from "sinon";

import {hangs} from "./utils.js";
import type {Context} from "../src/crank.js";
import {createElement} from "../src/crank.js";
import {renderer} from "../src/dom.js";

describe("copy-prop", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("host", () => {
		renderer.render(<div copy={true}>Hello world</div>, document.body);

		expect(document.body.innerHTML).toBe("<div>Hello world</div>");

		renderer.render(
			<div copy={true} style="background-color: red">
				Hello again
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div>Hello world</div>");

		renderer.render(
			<div copy={false} style="background-color: blue">
				Did you miss me?
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			'<div style="background-color: blue;">Did you miss me?</div>',
		);
	});

	test("component", () => {
		function Greeting({name}: any) {
			return <div>Hello {name}</div>;
		}

		renderer.render(<Greeting copy={true} name="world" />, document.body);

		expect(document.body.innerHTML).toBe("<div>Hello world</div>");

		renderer.render(<Greeting copy={true} name="Alice" />, document.body);

		expect(document.body.innerHTML).toBe("<div>Hello world</div>");

		renderer.render(<Greeting copy={false} name="Bob" />, document.body);

		expect(document.body.innerHTML).toBe("<div>Hello Bob</div>");
	});

	test("component refresh", () => {
		let ctx!: Context;

		function Greeting(this: Context, {name}: any) {
			ctx = this;
			return <div>Hello {name}</div>;
		}

		renderer.render(<Greeting copy={true} name="world" />, document.body);

		expect(document.body.innerHTML).toBe("<div>Hello world</div>");

		renderer.render(<Greeting copy={true} name="Alice" />, document.body);

		expect(document.body.innerHTML).toBe("<div>Hello world</div>");

		ctx.refresh();
		expect(document.body.innerHTML).toBe("<div>Hello Alice</div>");
	});

	test("async component", async () => {
		async function Greeting({name}: any) {
			await new Promise((resolve) => setTimeout(resolve));
			return <div>Hello {name}</div>;
		}

		await renderer.render(<Greeting copy={true} name="world" />, document.body);

		expect(document.body.innerHTML).toBe("<div>Hello world</div>");
		const p1 = renderer.render(
			<Greeting copy={true} name="Alice" />,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div>Hello world</div>");
		await p1;
		expect(document.body.innerHTML).toBe("<div>Hello world</div>");

		const p2 = renderer.render(
			<Greeting copy={false} name="Bob" />,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div>Hello world</div>");
		await p2;
		expect(document.body.innerHTML).toBe("<div>Hello Bob</div>");
	});

	test("async component refresh", async () => {
		let ctx!: Context;

		async function Greeting(this: Context, {name}: any) {
			ctx = this;
			await new Promise((resolve) => setTimeout(resolve));
			return <div>Hello {name}</div>;
		}

		await renderer.render(<Greeting copy={true} name="world" />, document.body);

		expect(document.body.innerHTML).toBe("<div>Hello world</div>");
		const p1 = renderer.render(
			<Greeting copy={true} name="Alice" />,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div>Hello world</div>");
		await p1;
		expect(document.body.innerHTML).toBe("<div>Hello world</div>");

		const p2 = ctx.refresh();
		expect(document.body.innerHTML).toBe("<div>Hello world</div>");
		await p2;
		expect(document.body.innerHTML).toBe("<div>Hello Alice</div>");
	});

	test("inflight", async () => {
		let resolve!: () => void;

		async function Greeting(this: Context, {name}: any) {
			await new Promise<void>((resolve1) => (resolve = resolve1));
			return <div>Hello {name}</div>;
		}

		const p1 = renderer.render(<Greeting name="world" />, document.body);

		const p2 = renderer.render(
			<Greeting copy={true} name="Alice" />,
			document.body,
		);

		await hangs(p1);
		await hangs(p2);
		resolve();
		expect(await p1).toBe(await p2);
	});

	test("generator component", async () => {
		let ctx!: Context;

		function* Greeting(this: Context, {name}: {name: string}) {
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

		renderer.render(<Greeting copy={true} name="world" />, document.body);

		expect(document.body.innerHTML).toBe("<div>Hello world 0</div>");

		renderer.render(<Greeting copy={true} name="Alice" />, document.body);

		expect(document.body.innerHTML).toBe("<div>Hello world 0</div>");

		ctx.refresh();
		expect(document.body.innerHTML).toBe("<div>Hello Alice 1</div>");
	});

	test("isolate higher-order component", () => {
		function isolate(Component: any) {
			return function Wrapper(props: any) {
				return <Component {...props} copy={true} />;
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
		expect(document.body.innerHTML).toBe("<div>Hello world 0</div>");

		renderer.render(<IsolatedGreeting name="Alice" />, document.body);
		expect(document.body.innerHTML).toBe("<div>Hello world 0</div>");

		renderer.render(<IsolatedGreeting name="Bob" />, document.body);
		expect(document.body.innerHTML).toBe("<div>Hello world 0</div>");

		ctx.refresh();
		expect(document.body.innerHTML).toBe("<div>Hello Bob 1</div>");
	});

	test("tag change", () => {
		renderer.render(<div copy={true}>Hello world</div>, document.body);
		renderer.render(<span copy={true}>Hello world</span>, document.body);
		expect(document.body.innerHTML).toBe("<span>Hello world</span>");
	});

	test("copy prop can include props", () => {
		renderer.render(
			<div
				copy="style greeting"
				style="color: red;"
				class="greeting"
				data-greeting={true}
			>
				Hello world
			</div>,
			document.body,
		);

		const div = document.querySelector("div") as HTMLDivElement;
		expect(div.className).toBe("greeting");
		expect(div.style.color).toBe("red");
		expect(div.dataset.greeting).toBe("");
		expect(div.innerHTML).toBe("Hello world");

		renderer.render(
			<div
				copy="style data-greeting"
				style="color: blue;"
				class="second-greeting"
				data-greeting={false}
			>
				Hello again
			</div>,
			document.body,
		);

		expect(div.className).toBe("second-greeting");
		expect(div.style.color).toBe("red");
		expect(div.dataset.greeting).toBe("");
		expect(div.innerHTML).toBe("Hello again");

		renderer.render(
			<div copy="style children" class="third-greeting" data-greeting={false}>
				Hello a third time
			</div>,
			document.body,
		);

		expect(div.className).toBe("third-greeting");
		expect(div.style.color).toBe("red");
		expect(div.dataset.greeting).toBe(undefined);
		expect(div.innerHTML).toBe("Hello again");

		renderer.render(
			<div class="fourth-greeting" style="color: yellow;" data-greeting={true}>
				Hello a fourth time
			</div>,
			document.body,
		);

		expect(div.className).toBe("fourth-greeting");
		expect(div.style.color).toBe("yellow");
		expect(div.dataset.greeting).toBe("");
		expect(div.innerHTML).toBe("Hello a fourth time");
	});

	test("copy prop can exclude props", () => {
		renderer.render(
			<div
				copy="style greeting"
				style="color: red;"
				class="greeting"
				data-greeting={true}
			>
				Hello world
			</div>,
			document.body,
		);

		const div = document.querySelector("div") as HTMLDivElement;
		expect(div.className).toBe("greeting");
		expect(div.dataset.greeting).toBe("");
		expect(div.style.color).toBe("red");
		expect(div.innerHTML).toBe("Hello world");

		renderer.render(
			<div
				copy="!style !data-greeting"
				style="color: blue;"
				class="second-greeting"
				data-greeting={false}
			>
				Hello again
			</div>,
			document.body,
		);

		expect(div.className).toBe("greeting");
		expect(div.style.color).toBe("blue");
		expect(div.innerHTML).toBe("Hello world");
		expect(div.dataset.greeting).toBe(undefined);
		renderer.render(
			<div
				copy="!style !data-greeting"
				class="second-greeting"
				data-greeting={false}
			>
				Hello again
			</div>,
			document.body,
		);

		expect(div.className).toBe("greeting");
		expect(div.style.cssText).toBe("");
		expect(div.innerHTML).toBe("Hello world");
		expect(div.dataset.greeting).toBe(undefined);
	});

	test("copy can include and exclude props but never both", () => {
		const consoleError = Sinon.stub(console, "error");
		renderer.render(
			<div
				copy="style data-greeting"
				style="color: red;"
				class="greeting"
				data-greeting={true}
			>
				Hello world
			</div>,
			document.body,
		);

		const div = document.querySelector("div") as HTMLDivElement;
		expect(div.className).toBe("greeting");
		expect(div.dataset.greeting).toBe("");
		expect(div.style.color).toBe("red");
		expect(div.innerHTML).toBe("Hello world");

		renderer.render(
			<div
				copy="!style !data-greeting"
				style="color: blue;"
				class="second-greeting"
				data-greeting={false}
			>
				Hello again
			</div>,
			document.body,
		);

		expect(div.className).toBe("greeting");
		expect(div.style.color).toBe("blue");
		expect(div.innerHTML).toBe("Hello world");
		expect(div.dataset.greeting).toBe(undefined);

		renderer.render(
			<div copy="!children" class="third-greeting" data-greeting={true}>
				Hello a third time
			</div>,
			document.body,
		);

		expect(div.className).toBe("greeting");
		expect(div.style.color).toBe("blue");
		expect(div.innerHTML).toBe("Hello a third time");
		expect(div.dataset.greeting).toBe(undefined);

		renderer.render(
			<div
				copy="!style data-greeting"
				class="fourth-greeting"
				data-greeting={false}
			>
				Hello a fourth time
			</div>,
			document.body,
		);

		expect(consoleError.callCount).toBe(1);
		expect(consoleError.firstCall.args[0]).toEqual(
			'Invalid copy prop "!style data-greeting".\nUse prop or !prop but not both.',
		);

		expect(document.body.innerHTML).toBe(
			'<div class="fourth-greeting">Hello a fourth time</div>',
		);

		consoleError.restore();
	});

	test("initial render with copy children", () => {
		renderer.render(
			<div copy="children" class="greeting">
				Hello world
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			'<div class="greeting">Hello world</div>',
		);

		renderer.render(
			<div copy="children" class="second-greeting">
				Hello again
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			'<div class="second-greeting">Hello world</div>',
		);

		renderer.render(
			<div copy={false} class="third-greeting">
				Hello a third time
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			'<div class="third-greeting">Hello a third time</div>',
		);
	});

	test("initial render with children excluded", () => {
		renderer.render(
			<div copy="!class" class="greeting">
				Hello world
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			'<div class="greeting">Hello world</div>',
		);

		renderer.render(
			<div copy="!class !children" class="second-greeting">
				Hello again
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			'<div class="second-greeting">Hello again</div>',
		);

		renderer.render(
			<div copy="class children" class="third-greeting">
				Hello a third time
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			'<div class="second-greeting">Hello again</div>',
		);
	});

	test("copy prop can be used for uncontrolled input values", () => {
		const spy = Sinon.spy();

		function* Component(this: Context<typeof Component>, {}: {}) {
			let force = false;
			let value = "Hello";
			for ({} of this) {
				yield (
					<div>
						<input
							type="text"
							copy={force ? false : "value"}
							value={value}
							oninput={(ev: InputEvent) => {
								spy(ev);
								value = (ev.target as HTMLInputElement).value;
								this.refresh();
							}}
						/>
						<button
							onclick={() => {
								force = true;
								this.refresh();
							}}
						>
							Click me
						</button>
					</div>
				);

				force = false;
			}
		}

		renderer.render(<Component />, document.body);
		// The value attr is never set, so HTML won't reflect the value.
		expect(document.body.innerHTML).toBe(
			'<div><input type="text"><button>Click me</button></div>',
		);
		const input = document.querySelector("input") as HTMLInputElement;
		expect(input.value).toBe("Hello");

		// simulate input event
		const toAdd = " world";
		for (let i = 0; i < toAdd.length; i++) {
			input.value = input.value + toAdd[i];
			input.dispatchEvent(new Event("input"));
			expect(spy.callCount).toBe(i + 1);
		}

		expect(input.value).toBe("Hello world");
		expect(spy.callCount).toBe(toAdd.length);
	});
});
