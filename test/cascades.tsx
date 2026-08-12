import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
import * as Sinon from "sinon";
import {createElement, Context} from "../src/crank.js";
import {renderer} from "../src/dom.js";

describe("cascades", () => {
	let mock: Sinon.SinonStub;
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
		mock = Sinon.stub(console, "error");
	});

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
		mock.restore();
	});

	test("sync function calls refresh directly", () => {
		function Component(this: Context) {
			this.refresh();
			return <div>Hello</div>;
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div>Hello</div>");
		expect(mock.callCount).toBe(1);
	});

	test("async function calls refresh directly", async () => {
		async function Component(this: Context) {
			this.refresh();
			return <div>Hello</div>;
		}

		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div>Hello</div>");
		expect(mock.callCount).toBe(1);
	});

	test("sync generator calls refresh directly", () => {
		function* Component(this: Context) {
			while (true) {
				this.refresh();
				yield <div>Hello</div>;
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div>Hello</div>");
		expect(mock.callCount).toBe(1);
	});

	test("async generator calls refresh directly", async () => {
		async function* Component(this: Context) {
			this.refresh();
			yield <span>Hello</span>;
			for await (const _ of this) {
				yield <span>Hello again</span>;
			}
		}

		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<span>Hello</span>");
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.innerHTML).toBe("<span>Hello</span>");
		expect(mock.callCount).toBe(1);
	});

	test("sync function parent and sync function child", () => {
		function Child(this: Context) {
			this.dispatchEvent(new Event("test", {bubbles: true}));
			return <span>child</span>;
		}

		function Parent(this: Context) {
			this.addEventListener("test", () => {
				this.refresh();
			});

			return (
				<div>
					<Child />
				</div>
			);
		}

		renderer.render(<Parent />, document.body);
		expect(document.body.innerHTML).toBe("<div><span>child</span></div>");
		expect(mock.callCount).toBe(1);
	});

	test("sync generator parent and sync function child", () => {
		function Child(this: Context) {
			this.dispatchEvent(new Event("test", {bubbles: true}));
			return <span>child</span>;
		}

		function* Parent(this: Context) {
			this.addEventListener("test", () => {
				this.refresh();
			});

			while (true) {
				yield (
					<div>
						<Child />
					</div>
				);
			}
		}

		renderer.render(<Parent />, document.body);
		expect(document.body.innerHTML).toBe("<div><span>child</span></div>");
		expect(mock.callCount).toBe(1);
	});

	test("sync generator parent and sync generator child", async () => {
		function* Child(this: Context) {
			this.dispatchEvent(new Event("test", {bubbles: true}));
			while (true) {
				yield <span>child</span>;
			}
		}

		function* Parent(this: Context) {
			this.addEventListener("test", () => {
				this.refresh();
			});

			while (true) {
				yield (
					<div>
						<Child />
					</div>
				);
			}
		}

		renderer.render(<Parent />, document.body);
		expect(document.body.innerHTML).toBe("<div><span>child</span></div>");
		expect(mock.callCount).toBe(1);
	});

	test("dispatchEvent in initial schedule callback", () => {
		function* Child(this: Context) {
			this.schedule(() => {
				this.dispatchEvent(new Event("test", {bubbles: true}));
			});

			while (true) {
				yield <span>child</span>;
			}
		}

		function Parent(this: Context) {
			this.addEventListener("test", () => {
				this.refresh();
			});

			return (
				<div>
					<Child />
				</div>
			);
		}

		renderer.render(<Parent />, document.body);
		expect(document.body.innerHTML).toBe("<div><span>child</span></div>");
		expect(mock.callCount).toBe(0);
	});

	// https://github.com/bikeshaving/crank/issues/336
	test("async generator refresh during await with for...of this", async () => {
		async function* Component(this: Context) {
			await Promise.resolve();
			this.refresh();
			for (const {} of this) {
				yield <span>Hello</span>;
			}
		}

		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<span>Hello</span>");
		expect(mock.callCount).toBe(0);
	});

	// https://github.com/bikeshaving/crank/issues/336
	test("async generator refresh during await with direct yield", async () => {
		async function* Component(this: Context) {
			await Promise.resolve();
			this.refresh();
			yield <span>Hello</span>;
			yield <span>Goodbye</span>;
		}

		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<span>Goodbye</span>");
		expect(mock.callCount).toBe(0);
	});
});
