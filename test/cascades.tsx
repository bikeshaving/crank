import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";
import {createElement, Context} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("cascades");

let mock: Sinon.SinonStub;
test.before.each(() => {
	mock = Sinon.stub(console, "error");
});

test.after.each(() => {
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
	Assert.is(document.body.innerHTML, "<div>Hello</div>");
	Assert.is(mock.callCount, 1);
});

test("async function calls refresh directly", async () => {
	async function Component(this: Context) {
		this.refresh();
		return <div>Hello</div>;
	}

	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello</div>");
	Assert.is(mock.callCount, 1);
});

test("sync generator calls refresh directly", () => {
	function* Component(this: Context) {
		while (true) {
			this.refresh();
			yield <div>Hello</div>;
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello</div>");
	Assert.is(mock.callCount, 1);
});

test("async generator calls refresh directly", async () => {
	async function* Component(this: Context) {
		yield <span>Hello</span>;
		this.refresh();
		for await (const _ of this) {
			yield <span>Hello again</span>;
		}
	}

	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<span>Hello</span>");
	await new Promise((resolve) => setTimeout(resolve, 0));
	Assert.is(document.body.innerHTML, "<span>Hello</span>");
	Assert.is(mock.callCount, 1);
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
	Assert.is(document.body.innerHTML, "<div><span>child</span></div>");
	Assert.is(mock.callCount, 1);
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
	Assert.is(document.body.innerHTML, "<div><span>child</span></div>");
	Assert.is(mock.callCount, 1);
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
	Assert.is(document.body.innerHTML, "<div><span>child</span></div>");
	Assert.is(mock.callCount, 1);
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
	Assert.is(document.body.innerHTML, "<div><span>child</span></div>");
	Assert.is(mock.callCount, 0);
});

test.run();
