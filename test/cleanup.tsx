import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
import * as Sinon from "sinon";

import type {Context, Element} from "../src/crank.js";
import {
	createElement,
	Fragment,
	Portal,
} from "../src/crank.js";
import {renderer} from "../src/dom.js";

describe("cleanup", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("function", () => {
		const fn = Sinon.fake();

		function Component(this: Context): Element {
			this.cleanup(fn);
			return <span>Hello</span>;
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		expect(fn.callCount).toBe(0);
		const span = document.body.firstChild!.firstChild;

		renderer.render(<div />, document.body);
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(span);
	});

	test("generator", () => {
		const fn = Sinon.fake();

		function* Component(this: Context): Generator<Element> {
			this.cleanup(fn);
			while (true) {
				yield <span>Hello</span>;
			}
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		expect(fn.callCount).toBe(0);
		const span = document.body.firstChild!.firstChild;

		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(span);
	});

	test("async function", async () => {
		const fn = Sinon.fake();

		async function Component(this: Context): Promise<Element> {
			this.cleanup(fn);
			await new Promise((resolve) => setTimeout(resolve, 1));
			return <span>Hello</span>;
		}

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		expect(fn.callCount).toBe(0);
		const span = document.body.firstChild!.firstChild;

		await renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(span);
	});

	test("async generator", async () => {
		const fn = Sinon.fake();

		async function* Component(this: Context): AsyncGenerator<Element> {
			this.cleanup(fn);
			for await (const _ of this) {
				await new Promise((resolve) => setTimeout(resolve, 1));
				yield <span>Hello</span>;
			}
		}

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		expect(fn.callCount).toBe(0);
		const span = document.body.firstChild!.firstChild;

		await renderer.render(<div />, document.body);
		// TODO: why is this setTimeout necessary???
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.innerHTML).toBe("<div></div>");
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(span);
	});

	test("multiple calls, same fn", () => {
		const fn = Sinon.fake();

		function* Component(this: Context): Generator<Element> {
			this.cleanup(fn);
			while (true) {
				yield <span>Hello</span>;
			}
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		expect(fn.callCount).toBe(0);
		const span = document.body.firstChild!.firstChild;

		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(span);
	});

	test("multiple calls, different fns", () => {
		const fn1 = Sinon.fake();
		const fn2 = Sinon.fake();

		function* Component(this: Context): Generator<Element> {
			this.cleanup(fn1);
			this.cleanup(fn2);
			while (true) {
				yield <span>Hello</span>;
			}
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		expect(fn1.callCount).toBe(0);
		expect(fn2.callCount).toBe(0);
		const span = document.body.firstChild!.firstChild;

		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		expect(fn1.callCount).toBe(1);
		expect(fn2.callCount).toBe(1);
		expect(fn1.lastCall.args[0]).toBe(span);
		expect(fn2.lastCall.args[0]).toBe(span);
	});

	test("multiple calls across updates", () => {
		const fn1 = Sinon.fake();
		const fn2 = Sinon.fake();

		function* Component(this: Context): Generator<Element> {
			let i = 0;
			while (true) {
				this.cleanup(fn1);
				this.cleanup(fn2);
				yield <span>{i++}</span>;
			}
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div><span>0</span></div>");
		expect(fn1.callCount).toBe(0);
		expect(fn2.callCount).toBe(0);
		const span = document.body.firstChild!.firstChild;

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div><span>1</span></div>");
		expect(fn1.callCount).toBe(0);
		expect(fn2.callCount).toBe(0);
		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div><span>2</span></div>");
		expect(fn1.callCount).toBe(0);
		expect(fn2.callCount).toBe(0);
		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div><span>3</span></div>");
		expect(fn1.callCount).toBe(0);
		expect(fn2.callCount).toBe(0);

		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		expect(fn1.callCount).toBe(1);
		expect(fn2.callCount).toBe(1);
		expect(fn1.lastCall.args[0]).toBe(span);
		expect(fn2.lastCall.args[0]).toBe(span);
	});

	test("component child", () => {
		function Child(): Element {
			return <span>Hello</span>;
		}

		const fn = Sinon.fake();

		function* Component(this: Context): Generator<Element> {
			this.cleanup(fn);
			while (true) {
				yield <Child />;
			}
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		expect(fn.callCount).toBe(0);
		const span = document.body.firstChild!.firstChild;

		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(span);
	});

	test("async child", async () => {
		async function Child(): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 1));
			return <span>Hello</span>;
		}

		const fn = Sinon.fake();

		function* Component(this: Context): Generator<Element> {
			this.cleanup(fn);
			while (true) {
				yield <Child />;
			}
		}

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		expect(fn.callCount).toBe(0);
		const span = document.body.firstChild!.firstChild;

		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(span);
	});

	test("fragment child", () => {
		const fn = Sinon.fake();

		function* Component(this: Context): Generator<Element> {
			this.cleanup(fn);
			while (true) {
				yield (
					<Fragment>
						<div>1</div>
						<div>2</div>
						<div>3</div>
					</Fragment>
				);
			}
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><div>1</div><div>2</div><div>3</div></div>",
		);
		expect(fn.callCount).toBe(0);
		const children = Array.from(document.body.firstChild!.childNodes);
		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toEqual(children);
	});

	test("hanging child", async () => {
		const fn = Sinon.fake();

		async function Hanging(): Promise<never> {
			await new Promise(() => {});
			throw new Error("This should never be reached");
		}

		function* Component(this: Context): Generator<Element> {
			this.cleanup(fn);
			while (true) {
				yield <Hanging />;
			}
		}

		const p = renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(fn.callCount).toBe(0);
		expect(document.body.innerHTML).toBe("");
		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(undefined);
		await p;
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(undefined);
	});

	test("cleanup is called even if component is prematurely unmounted", async () => {
		const fn = Sinon.fake();

		async function* Component(this: Context) {
			fn();
			await new Promise((r) => setTimeout(r, 100));
			this.cleanup(() => {
				fn();
			});
			for ({} of this) {
				yield null;
			}
		}

		renderer.render(<Component />, document.body);
		renderer.render(null, document.body);

		expect(fn.callCount).toBe(1);
		await new Promise((r) => setTimeout(r, 200));
		expect(fn.callCount).toBe(2);
	});

	test("components can linger", async () => {
		const fn = Sinon.fake();
		let resolve: (value?: any) => void;

		function* Component(this: Context) {
			this.cleanup(() => {
				fn();
				return new Promise((resolve1) => (resolve = resolve1));
			});
			for ({} of this) {
				yield <span>Hello</span>;
			}
		}

		renderer.render(
			<div>
				<Component /> <span>World</span>
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			"<div><span>Hello</span> <span>World</span></div>",
		);

		renderer.render(<div />, document.body);
		expect(fn.callCount).toBe(1);
		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		resolve!();
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("<div></div>");
	});

	test("multiple components linger and unmount independently", async () => {
		const mock1 = Sinon.fake();
		const mock2 = Sinon.fake();
		let resolve1!: (value?: any) => void;
		let resolve2!: (value?: any) => void;

		function* Child1(this: Context) {
			this.cleanup(() => {
				mock1();
				return new Promise((r) => (resolve1 = r));
			});
			for ({} of this) {
				yield <span>One</span>;
			}
		}

		function* Child3(this: Context) {
			this.cleanup(() => {
				mock2();
				return new Promise((r) => (resolve2 = r));
			});
			for ({} of this) {
				yield <span>Three</span>;
			}
		}

		renderer.render(
			<div>
				<Child1 />
				<span>Two</span>
				<Child3 />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			"<div><span>One</span><span>Two</span><span>Three</span></div>",
		);

		renderer.render(
			<div>
				<span>Two</span>
			</div>,
			document.body,
		);

		expect(mock1.callCount).toBe(1);
		expect(mock2.callCount).toBe(1);
		expect(document.body.innerHTML).toBe(
			"<div><span>One</span><span>Two</span><span>Three</span></div>",
		);

		resolve1();
		expect(document.body.innerHTML).toBe(
			"<div><span>One</span><span>Two</span><span>Three</span></div>",
		);
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe(
			"<div><span>Two</span><span>Three</span></div>",
		);
		resolve2();
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("<div><span>Two</span></div>");
	});

	test("nested components linger correctly", async () => {
		const parentCleanup = Sinon.fake();
		const childCleanup = Sinon.fake();
		let resolveParent!: (value?: any) => void;
		let resolveChild!: (value?: any) => void;

		function* Parent(this: Context) {
			this.cleanup(() => {
				parentCleanup();
				return new Promise((r) => (resolveParent = r));
			});
			for ({} of this) {
				yield <Child />;
			}
		}

		function* Child(this: Context) {
			this.cleanup(() => {
				childCleanup();
				return new Promise((r) => (resolveChild = r));
			});
			yield <span>Child</span>;
		}

		renderer.render(
			<div>
				<Parent />
				<span>Sibling</span>
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			"<div><span>Child</span><span>Sibling</span></div>",
		);

		// Remove Parent but keep Child lingering
		renderer.render(
			<div>
				<span>Sibling</span>
			</div>,
			document.body,
		);

		expect(parentCleanup.callCount).toBe(1);
		expect(childCleanup.callCount).toBe(0);
		expect(document.body.innerHTML).toBe(
			"<div><span>Child</span><span>Sibling</span></div>",
		);

		resolveParent();
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe(
			"<div><span>Child</span><span>Sibling</span></div>",
		);

		expect(parentCleanup.callCount).toBe(1);
		expect(childCleanup.callCount).toBe(1);

		resolveChild();
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("<div><span>Sibling</span></div>");
	});

	test("fragments handle lingering components correctly", async () => {
		const cleanupA = Sinon.fake();
		const cleanupB = Sinon.fake();
		let resolveA!: (value?: any) => void;
		let resolveB!: (value?: any) => void;

		function* ComponentA(this: Context) {
			this.cleanup(() => {
				cleanupA();
				return new Promise((r) => (resolveA = r));
			});
			yield <span>A</span>;
		}

		function* ComponentB(this: Context) {
			this.cleanup(() => {
				cleanupB();
				return new Promise((r) => (resolveB = r));
			});
			yield <span>B</span>;
		}

		renderer.render(
			<div>
				<Fragment>
					<ComponentA />
					<ComponentB />
				</Fragment>
				<span>Sibling</span>
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			"<div><span>A</span><span>B</span><span>Sibling</span></div>",
		);

		// Remove the fragment, keep lingering components
		renderer.render(
			<div>
				<span>Sibling</span>
			</div>,
			document.body,
		);
		expect(cleanupA.callCount).toBe(1);
		expect(cleanupB.callCount).toBe(1);
		expect(document.body.innerHTML).toBe(
			"<div><span>A</span><span>Sibling</span><span>B</span></div>",
		);

		resolveA();
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe(
			"<div><span>Sibling</span><span>B</span></div>",
		);

		resolveB();
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("<div><span>Sibling</span></div>");
	});

	test("component without children does not linger", async () => {
		const cleanup = Sinon.fake();
		let resolve!: (value?: any) => void;

		function* Component(this: Context, {condition}: {condition: boolean}) {
			this.cleanup(() => {
				cleanup();
				return new Promise((r) => (resolve = r));
			});

			for ({condition} of this) {
				if (condition) {
					yield <span>Child</span>;
				} else {
					yield null;
				}
			}
		}

		renderer.render(<Component condition={true} />, document.body);
		expect(document.body.innerHTML).toBe("<span>Child</span>");

		renderer.render(<Component condition={false} />, document.body);
		expect(cleanup.callCount).toBe(0);
		expect(document.body.innerHTML).toBe("");
		renderer.render(<div />, document.body);
		expect(cleanup.callCount).toBe(1);
		resolve();
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("<div></div>");
	});

	test("lingering component cleared when parent unmounted", async () => {
		const cleanup = Sinon.fake();

		function* Child(this: Context) {
			this.cleanup(() => {
				cleanup();
				return new Promise(() => {});
			});
			for ({} of this) {
				yield <span>Child</span>;
			}
		}

		renderer.render(
			<div>
				<Child />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>Child</span></div>");
		renderer.render(<div></div>, document.body);
		expect(cleanup.callCount).toBe(1);
		renderer.render(<span>No more div</span>, document.body);
		expect(document.body.innerHTML).toBe("<span>No more div</span>");
		expect(cleanup.callCount).toBe(1);
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("<span>No more div</span>");
	});

	test("component wrapping lingering component (no host boundary)", async () => {
		// AlertModal wraps Modal directly (no intermediate <div>).
		// Does Modal linger when AlertModal is removed?
		const cleanup = Sinon.fake();
		let resolve!: (value?: any) => void;

		function* Modal(this: Context) {
			this.cleanup(() => {
				cleanup();
				return new Promise((r) => (resolve = r));
			});
			for ({} of this) {
				yield <span>Modal</span>;
			}
		}

		function AlertModal() {
			return <Modal />;
		}

		renderer.render(
			<div>
				<AlertModal />
				<span>Sibling</span>
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			"<div><span>Modal</span><span>Sibling</span></div>",
		);

		renderer.render(
			<div>
				<span>Sibling</span>
			</div>,
			document.body,
		);

		expect(cleanup.callCount).toBe(1);
		// Modal lingers because isNested stays false through components
		expect(document.body.innerHTML).toBe(
			"<div><span>Modal</span><span>Sibling</span></div>",
		);

		resolve();
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe(
			"<div><span>Sibling</span></div>",
		);
	});

	test("component wrapping lingering component with host boundary", async () => {
		// AlertModal wraps Modal inside a <div class="wrapper">.
		// Does Modal linger when AlertModal is removed?
		const cleanup = Sinon.fake();
		let _resolve!: (value?: any) => void;

		function* Modal(this: Context) {
			this.cleanup(() => {
				cleanup();
				return new Promise((r) => (_resolve = r));
			});
			for ({} of this) {
				yield <span>Modal</span>;
			}
		}

		function AlertModal() {
			return (
				<div class="wrapper">
					<Modal />
				</div>
			);
		}

		renderer.render(
			<div>
				<AlertModal />
				<span>Sibling</span>
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			'<div><div class="wrapper"><span>Modal</span></div><span>Sibling</span></div>',
		);

		renderer.render(
			<div>
				<span>Sibling</span>
			</div>,
			document.body,
		);

		expect(cleanup.callCount).toBe(1);
		// Modal cannot linger because <div class="wrapper"> forces isNested=true
		// So everything is removed immediately
		expect(document.body.innerHTML).toBe(
			"<div><span>Sibling</span></div>",
		);
	});

	test("lingering component can refresh during cleanup", async () => {
		// Modal calls this.refresh() in cleanup to trigger exit animation class.
		// Does the refresh actually re-render?
		let resolve!: (value?: any) => void;

		function* Modal(this: Context) {
			let visible = true;
			this.cleanup(() => {
				this.refresh(() => (visible = false));
				return new Promise((r) => (resolve = r));
			});
			for ({} of this) {
				yield <div class={visible ? "visible" : "hidden"}>Modal</div>;
			}
		}

		renderer.render(
			<div>
				<Modal />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			'<div><div class="visible">Modal</div></div>',
		);

		renderer.render(<div />, document.body);

		// refresh during cleanup triggers re-render with visible=false
		expect(document.body.innerHTML).toBe(
			'<div><div class="hidden">Modal</div></div>',
		);

		resolve();
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("<div></div>");
	});

	test("deeply nested component wrapping (no host boundaries)", async () => {
		// Three levels of component wrapping: Outer -> Middle -> Modal
		// No host elements between them. Does Modal linger?
		const cleanup = Sinon.fake();
		let resolve!: (value?: any) => void;

		function* Modal(this: Context) {
			this.cleanup(() => {
				cleanup();
				return new Promise((r) => (resolve = r));
			});
			for ({} of this) {
				yield <span>Modal</span>;
			}
		}

		function Middle() {
			return <Modal />;
		}

		function Outer() {
			return <Middle />;
		}

		renderer.render(
			<div>
				<Outer />
				<span>Sibling</span>
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			"<div><span>Modal</span><span>Sibling</span></div>",
		);

		renderer.render(
			<div>
				<span>Sibling</span>
			</div>,
			document.body,
		);

		expect(cleanup.callCount).toBe(1);
		expect(document.body.innerHTML).toBe(
			"<div><span>Modal</span><span>Sibling</span></div>",
		);

		resolve();
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("<div><span>Sibling</span></div>");
	});

	test("component rendering Portal can linger", async () => {
		// Modal renders its content via a Portal. Portal content should
		// stay visible during async cleanup (lingering).
		const cleanup = Sinon.fake();
		let resolve!: (value?: any) => void;

		const portalRoot = document.createElement("div");
		document.body.appendChild(portalRoot);

		function* Modal(this: Context) {
			this.cleanup(() => {
				cleanup();
				return new Promise((r) => (resolve = r));
			});
			for ({} of this) {
				yield (
					<Portal root={portalRoot}>
						<div class="modal">Modal Content</div>
					</Portal>
				);
			}
		}

		renderer.render(
			<div>
				<Modal />
				<span>Sibling</span>
			</div>,
			document.body,
		);

		expect(portalRoot.innerHTML).toBe('<div class="modal">Modal Content</div>');
		expect(document.body.innerHTML.includes("<span>Sibling</span>")).toBe(true);

		renderer.render(
			<div>
				<span>Sibling</span>
			</div>,
			document.body,
		);

		expect(cleanup.callCount).toBe(1);
		// Portal content should linger during async cleanup
		expect(portalRoot.innerHTML).toBe(
			'<div class="modal">Modal Content</div>',
		);

		resolve();
		await new Promise((resolve) => setTimeout(resolve));

		expect(portalRoot.innerHTML).toBe(
			"",
		);

		document.body.removeChild(portalRoot);
	});

	test("Portal-rendering component can refresh during linger", async () => {
		// Modal renders via Portal, calls this.refresh() in cleanup to trigger
		// CSS transition class, then defers with a Promise.
		let resolve!: (value?: any) => void;

		const portalRoot = document.createElement("div");
		document.body.appendChild(portalRoot);

		function* Modal(this: Context) {
			let visible = true;
			this.cleanup(() => {
				this.refresh(() => (visible = false));
				return new Promise((r) => (resolve = r));
			});
			for ({} of this) {
				yield (
					<Portal root={portalRoot}>
						<div class={visible ? "visible" : "hidden"}>Modal</div>
					</Portal>
				);
			}
		}

		renderer.render(
			<div>
				<Modal />
			</div>,
			document.body,
		);

		expect(portalRoot.innerHTML).toBe('<div class="visible">Modal</div>');

		renderer.render(<div />, document.body);

		// Modal should re-render with hidden class during linger
		expect(portalRoot.innerHTML).toBe(
			'<div class="hidden">Modal</div>',
		);

		resolve();
		await new Promise((resolve) => setTimeout(resolve));

		expect(portalRoot.innerHTML).toBe(
			"",
		);

		document.body.removeChild(portalRoot);
	});

	test("lingering component can refresh multiple times", async () => {
		// Component plays a multi-step exit animation via repeated refreshes
		let step = 0;
		let resolve!: (value?: any) => void;

		function* Animated(this: Context) {
			this.cleanup(() => {
				this.refresh(() => (step = 1));
				return new Promise((r) => (resolve = r));
			});
			for ({} of this) {
				yield <div class={`step-${step}`}>Content</div>;
			}
		}

		renderer.render(
			<div>
				<Animated />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			'<div><div class="step-0">Content</div></div>',
		);

		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toBe(
			'<div><div class="step-1">Content</div></div>',
		);

		resolve();
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("<div></div>");
	});

	test("lingering component responds to events during linger", async () => {
		let clickCount = 0;
		let resolve!: (value?: any) => void;

		function* Counter(this: Context) {
			this.cleanup(() => {
				return new Promise((r) => (resolve = r));
			});
			this.addEventListener("click", () => {
				this.refresh(() => clickCount++);
			});
			for ({} of this) {
				yield <button>Clicked {clickCount} times</button>;
			}
		}

		renderer.render(
			<div>
				<Counter />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			"<div><button>Clicked 0 times</button></div>",
		);

		// Remove Counter — it should linger
		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toBe(
			"<div><button>Clicked 0 times</button></div>",
		);

		// Click the button while lingering
		document.querySelector("button")!.click();
		expect(document.body.innerHTML).toBe(
			"<div><button>Clicked 1 times</button></div>",
		);

		document.querySelector("button")!.click();
		expect(document.body.innerHTML).toBe(
			"<div><button>Clicked 2 times</button></div>",
		);

		resolve();
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("<div></div>");
	});

	test("lingering component children update on refresh", async () => {
		let resolve!: (value?: any) => void;
		let phase = "active";

		function Badge({label}: {label: string}) {
			return <span class="badge">{label}</span>;
		}

		function* Panel(this: Context) {
			this.cleanup(() => {
				this.refresh(() => (phase = "exiting"));
				return new Promise((r) => (resolve = r));
			});
			for ({} of this) {
				yield (
					<div>
						<Badge label={phase} />
					</div>
				);
			}
		}

		renderer.render(
			<div>
				<Panel />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			'<div><div><span class="badge">active</span></div></div>',
		);

		renderer.render(<div />, document.body);

		expect(document.body.innerHTML).toBe(
			'<div><div><span class="badge">exiting</span></div></div>',
		);

		resolve();
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("<div></div>");
	});

	test("lingering component with async refresh during linger", async () => {
		// Simulates a real exit animation: cleanup triggers state change,
		// then a timer fires and resolves the cleanup promise
		let visible = true;
		let cleanupResolve!: (value?: any) => void;

		function* Toast(this: Context) {
			this.cleanup(() => {
				this.refresh(() => (visible = false));
				return new Promise((r) => (cleanupResolve = r));
			});
			for ({} of this) {
				yield <div class={visible ? "toast show" : "toast hide"}>Message</div>;
			}
		}

		renderer.render(
			<div>
				<Toast />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			'<div><div class="toast show">Message</div></div>',
		);

		renderer.render(<div />, document.body);

		// Immediately after unmount: class should flip
		expect(document.body.innerHTML).toBe(
			'<div><div class="toast hide">Message</div></div>',
		);

		// Resolve after a tick (simulating setTimeout in real code)
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Still lingering — hasn't resolved yet
		expect(document.body.innerHTML).toBe(
			'<div><div class="toast hide">Message</div></div>',
		);

		cleanupResolve();
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("<div></div>");
	});
});
