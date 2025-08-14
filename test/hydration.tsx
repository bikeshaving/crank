/// <ref lib="dom" />
import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";
import {
	createElement,
	Fragment,
	Portal,
	Raw,
	Text as Text1,
} from "../src/crank.js";
import type {Context} from "../src/crank.js";

import {renderer} from "../src/dom.js";

const test = suite("hydration");
let consoleWarn: Sinon.SinonStub;
let container: HTMLDivElement;
test.before.each(() => {
	document.body.innerHTML = "";
	container = document.createElement("div");
	document.body.appendChild(container);
	consoleWarn = Sinon.stub(console, "warn");
});

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
	consoleWarn.restore();
});

test("simple", () => {
	container.innerHTML = "<button>Click</button>";
	const button = container.firstChild as HTMLButtonElement;
	const onclick = Sinon.fake();
	renderer.hydrate(<button onclick={onclick}>Click</button>, container);

	Assert.is(container.innerHTML, "<button>Click</button>");
	Assert.is(container.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("fragment", () => {
	container.innerHTML = "<button>Click</button>";
	const button = container.firstChild as HTMLButtonElement;
	const onclick = Sinon.fake();
	renderer.hydrate(
		<Fragment>
			<button onclick={onclick}>Click</button>
		</Fragment>,
		container,
	);

	Assert.is(container.innerHTML, "<button>Click</button>");
	Assert.is(container.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("sync function component", () => {
	container.innerHTML = "<button>Click</button>";
	const button = container.firstChild as HTMLButtonElement;

	const onclick = Sinon.fake();
	const Component = Sinon.fake(function Component() {
		return <button onclick={onclick}>Click</button>;
	});

	renderer.hydrate(<Component />, container);

	Assert.ok(Component.called);
	Assert.is(container.innerHTML, "<button>Click</button>");
	Assert.is(container.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("sync generator component", () => {
	container.innerHTML = "<button>Click</button>";
	const button = container.firstChild as HTMLButtonElement;

	const onclick = Sinon.fake();
	const Component = Sinon.fake(function* Component(this: Context) {
		for ({} of this) {
			yield <button onclick={onclick}>Click</button>;
		}
	});

	renderer.hydrate(<Component />, container);

	Assert.ok(Component.called);
	Assert.is(container.innerHTML, "<button>Click</button>");
	Assert.is(container.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("refresh", () => {
	container.innerHTML = "<button>Click</button>";
	const button = container.firstChild as HTMLButtonElement;

	const onclick = Sinon.fake();
	const Component = Sinon.fake(function* Component(this: Context) {
		let count = 0;
		for ({} of this) {
			yield (
				<button
					onclick={() => {
						onclick();
						count++;
						this.refresh();
					}}
				>
					Click {count}
				</button>
			);
		}
	});

	renderer.hydrate(<Component />, container);

	Assert.ok(Component.called);
	Assert.is(container.innerHTML, "<button>Click 0</button>");
	Assert.is(container.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(container.innerHTML, "<button>Click 1</button>");
	Assert.is(container.firstChild, button);
	Assert.is(consoleWarn.callCount, 2);
});

test("async function component", async () => {
	container.innerHTML = "<button>Click</button>";
	const button = container.firstChild as HTMLButtonElement;

	const onclick = Sinon.fake();
	const Component = Sinon.fake(async function Component() {
		return <button onclick={onclick}>Click</button>;
	});

	await renderer.hydrate(<Component />, container);

	Assert.ok(Component.called);
	Assert.is(container.innerHTML, "<button>Click</button>");
	Assert.is(container.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("async generator component", async () => {
	container.innerHTML = "<button>Click</button>";
	const button = container.firstChild as HTMLButtonElement;

	const onclick = Sinon.fake();
	const Component = Sinon.fake(async function* Component(this: Context) {
		for await ({} of this) {
			yield <button onclick={onclick}>Click</button>;
		}
	});

	await renderer.hydrate(<Component />, container);

	Assert.ok(Component.called);
	Assert.is(container.innerHTML, "<button>Click</button>");
	Assert.is(container.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("async component and host sibling", async () => {
	container.innerHTML =
		"<div><div><button>Slow</button></div><button>Fast</button></div>";
	const div = container.firstChild!;
	const button1 = div.childNodes[0].childNodes[0] as HTMLButtonElement;
	const button2 = div.childNodes[1] as HTMLButtonElement;
	const onclick1 = Sinon.fake();
	const onclick2 = Sinon.fake();
	async function Component() {
		await new Promise((resolve) => setTimeout(resolve, 5));
		return (
			<div>
				<button onclick={onclick1}>Slow</button>
			</div>
		);
	}

	await renderer.hydrate(
		<div>
			<Component />
			<button onclick={onclick2}>Fast</button>
		</div>,
		container,
	);
	Assert.is(
		container.innerHTML,
		"<div><div><button>Slow</button></div><button>Fast</button></div>",
	);
	Assert.is(container.firstChild, div);
	Assert.is(container.firstChild!.childNodes[0].childNodes[0], button1);
	Assert.is(container.firstChild!.childNodes[1], button2);
	button1.click();
	button2.click();
	Assert.ok(onclick1.called);
	Assert.ok(onclick2.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("async sibling components resolve out of order", async () => {
	container.innerHTML = "<div><button>Slow</button><button>Fast</button></div>";
	const div = container.firstChild!;
	const button1 = div.childNodes[0] as HTMLButtonElement;
	const button2 = div.childNodes[1] as HTMLButtonElement;
	const onclick1 = Sinon.fake();
	const onclick2 = Sinon.fake();
	async function Slow() {
		await new Promise((resolve) => setTimeout(resolve, 5));
		return <button onclick={onclick1}>Slow</button>;
	}

	async function Fast() {
		return <button onclick={onclick2}>Fast</button>;
	}

	function Component() {
		return (
			<div>
				<Slow />
				<Fast />
			</div>
		);
	}

	await renderer.hydrate(<Component />, container);
	Assert.is(
		container.innerHTML,
		"<div><button>Slow</button><button>Fast</button></div>",
	);

	Assert.is(container.firstChild, div);
	Assert.is(container.firstChild!.childNodes[0], button1);
	Assert.is(container.firstChild!.childNodes[1], button2);
	button1.click();
	button2.click();
	Assert.ok(onclick1.called);
	Assert.ok(onclick2.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("text sibling", async () => {
	container.innerHTML = "<div>Text1<button>Click</button>Text2</div>";
	const div = container.firstChild!;
	const text1 = div.childNodes[0] as Text;
	const button = div.childNodes[1] as HTMLButtonElement;
	const text2 = div.childNodes[2] as Text;
	const Component = Sinon.fake(function () {
		return (
			<Fragment>
				Text1<button onclick={onclick}>Click</button>Text2
			</Fragment>
		);
	});

	renderer.hydrate(
		<div>
			<Component />
		</div>,
		container,
	);

	Assert.is(container.innerHTML, "<div>Text1<button>Click</button>Text2</div>");

	Assert.is(container.firstChild, div);
	Assert.is(container.firstChild!.childNodes[0], text1);
	Assert.is(container.firstChild!.childNodes[1], button);
	Assert.is(container.firstChild!.childNodes[2], text2);
	Assert.is(consoleWarn.callCount, 0);
});

test("split text", async () => {
	container.innerHTML = "<div>Text1Text2<button>Click</button></div>";
	const div = container.firstChild!;
	const text = div.childNodes[0] as Text;
	const button = div.childNodes[1] as HTMLButtonElement;
	const Component = Sinon.fake(function () {
		return (
			<Fragment>
				{"Text1"}
				{"Text2"}
				<button onclick={onclick}>Click</button>
			</Fragment>
		);
	});

	renderer.hydrate(
		<div>
			<Component />
		</div>,
		container,
	);

	Assert.is(container.innerHTML, "<div>Text1Text2<button>Click</button></div>");

	Assert.is(container.firstChild, div);
	Assert.is(container.firstChild!.childNodes[0], text);
	Assert.is(container.firstChild!.childNodes[1].nodeType, Node.TEXT_NODE);
	Assert.is(container.firstChild!.childNodes[2], button);
	Assert.is(consoleWarn.callCount, 0);
});

test("mismatched tag", () => {
	container.innerHTML = "<div>Hello</div>";
	const onclick = Sinon.fake();
	const Component = Sinon.fake(function () {
		return <button onclick={onclick}>Click</button>;
	});

	renderer.hydrate(<Component />, container);
	Assert.ok(Component.called);
	Assert.is(container.innerHTML, "<button>Click</button>");
	Assert.is(consoleWarn.callCount, 1);
});

test("mismatched text", () => {
	container.innerHTML = "<button>Do not click</button>";
	const button = container.firstChild as HTMLButtonElement;
	const onclick = Sinon.fake();

	const Component = Sinon.fake(function () {
		return <button onclick={onclick}>Click</button>;
	});

	renderer.hydrate(<Component />, container);
	Assert.ok(Component.called);
	Assert.is(container.innerHTML, "<button>Click</button>");
	Assert.is(container.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 1);
});

test("missing element", () => {
	function Component() {
		return <button>Click</button>;
	}

	renderer.hydrate(<Component />, container);
	Assert.is(container.innerHTML, "<button>Click</button>");
	Assert.is(consoleWarn.callCount, 1);
});

test("raw element", () => {
	container.innerHTML = "<div><div>Raw</div><button>Click</button></div>";
	const onclick = Sinon.fake();
	const button = container.childNodes[0].childNodes[1] as HTMLButtonElement;
	const Component = Sinon.fake(function () {
		return (
			<div>
				<Raw value="<div>Raw</div>" />
				<button onclick={onclick}>Click</button>
			</div>
		);
	});

	renderer.hydrate(<Component />, container);
	Assert.ok(Component.called);
	Assert.is(
		container.innerHTML,
		"<div><div>Raw</div><button>Click</button></div>",
	);
	Assert.is(container.childNodes[0].childNodes[1], button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("raw multiple elements", () => {
	container.innerHTML =
		"<div><div>Raw 1</div><div>Raw 2</div><button>Click</button></div>";
	const onclick = Sinon.fake();
	const button = container.childNodes[0].childNodes[2] as HTMLButtonElement;
	const Component = Sinon.fake(function () {
		return (
			<div>
				<Raw value="<div>Raw 1</div><div>Raw 2</div>" />
				<button onclick={onclick}>Click</button>
			</div>
		);
	});

	renderer.hydrate(<Component />, container);
	Assert.ok(Component.called);
	Assert.is(
		container.innerHTML,
		"<div><div>Raw 1</div><div>Raw 2</div><button>Click</button></div>",
	);
	Assert.is(container.childNodes[0].childNodes[2], button);
	button.click();
	Assert.ok(onclick.called);
});

test("raw text", () => {
	container.innerHTML = "<div>Raw<button>Click</button></div>";
	const onclick = Sinon.fake();
	const button = container.childNodes[0].childNodes[1] as HTMLButtonElement;
	const Component = Sinon.fake(function () {
		return (
			<div>
				<Raw value="Raw" />
				<button onclick={onclick}>Click</button>
			</div>
		);
	});

	renderer.hydrate(<Component />, container);
	Assert.ok(Component.called);
	Assert.is(container.innerHTML, "<div>Raw<button>Click</button></div>");
	Assert.is(container.childNodes[0].childNodes[1], button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("raw comment", () => {
	container.innerHTML =
		"<div><!-- comment -->Hello<button>Click</button></div>";
	const onclick = Sinon.fake();
	const button = container.childNodes[0].childNodes[2] as HTMLButtonElement;
	const Component = Sinon.fake(function () {
		return (
			<div>
				<Raw value="<!-- comment -->" />
				Hello
				<button onclick={onclick}>Click</button>
			</div>
		);
	});

	renderer.hydrate(<Component />, container);
	Assert.ok(Component.called);
	Assert.is(
		container.innerHTML,
		"<div><!-- comment -->Hello<button>Click</button></div>",
	);

	Assert.is(container.childNodes[0].childNodes[2], button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("ref called with hydrated element", () => {
	container.innerHTML = "<button>Click</button>";
	const button = container.firstChild as HTMLButtonElement;
	const ref = Sinon.fake();
	const onclick = Sinon.fake();

	renderer.hydrate(
		<button ref={ref} onclick={onclick}>
			Click
		</button>,
		container,
	);

	Assert.is(container.innerHTML, "<button>Click</button>");
	Assert.is(container.firstChild, button);
	Assert.ok(ref.calledOnce);
	Assert.is(ref.lastCall.firstArg, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("warns when attribute present but should be missing during hydration", () => {
	container.innerHTML = `<div foo="bar"></div>`;
	renderer.hydrate(<div foo={null} />, container);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "foo" to be missing/);
});

test("warns when attribute missing but should be present during hydration", () => {
	container.innerHTML = `<div></div>`;
	renderer.hydrate(<div foo={true} />, container);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "foo" to be ""/);
});

test("warns when attribute value mismatches during hydration", () => {
	container.innerHTML = `<div foo="baz"></div>`;
	renderer.hydrate(<div foo="bar" />, container);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "foo" to be "bar"/);
});

test("warns when style present but should be missing during hydration", () => {
	container.innerHTML = `<div style="color: red"></div>`;
	renderer.hydrate(<div style={null} />, container);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "style" to be missing/);
});

test.skip("warns when style should be empty string during hydration", () => {
	container.innerHTML = `<div style="color: red"></div>`;
	renderer.hydrate(<div style="" />, container);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "style" to be ""/);
});

test.skip("warns when style value mismatches during hydration", () => {
	container.innerHTML = `<div style="color: red"></div>`;
	renderer.hydrate(<div style="color: blue" />, container);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "style" to be "color: blue"/,
	);
});

test("warns when class present but should be missing during hydration", () => {
	container.innerHTML = `<div class="foo"></div>`;
	renderer.hydrate(<div class={null} />, container);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "class" to be missing/);
});

test("warns when class should be empty string during hydration", () => {
	container.innerHTML = `<div class="foo"></div>`;
	renderer.hydrate(<div class="" />, container);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "class" to be ""/);
});

test("warns when class value mismatches during hydration", () => {
	container.innerHTML = `<div class="foo"></div>`;
	renderer.hydrate(<div class="bar" />, container);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "class" to be "bar"/);
});

test("warns when innerHTML mismatches during hydration", () => {
	container.innerHTML = `<div>baz</div>`;
	renderer.hydrate(<div innerHTML="bar" />, container);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "innerHTML" to be "bar"/,
	);
});

test("warns when style property present but should be missing during hydration", () => {
	container.innerHTML = `<div style="color: red"></div>`;
	renderer.hydrate(<div style={{color: null}} />, container);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "style\.color" to be missing/,
	);
});

test("warns when id mismatches during hydration", () => {
	container.innerHTML = `<div id="server"></div>`;
	renderer.hydrate(<div id="client" />, container);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "id" to be "client"/);
});

test("warns when input type and value mismatches during hydration", () => {
	container.innerHTML = `<input type="email" value="server">`;
	renderer.hydrate(<input type="text" value="client" />, container);
	Assert.is(consoleWarn.callCount, 2);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "type" to be "text"/);
	Assert.match(
		consoleWarn.secondCall.args[0],
		/Expected "value" to be "client"/,
	);
});

test.skip("warns when style property value mismatches during hydration", () => {
	container.innerHTML = `<div style="color: red"></div>`;
	renderer.hydrate(<div style={{color: "blue"}} />, container);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "style\.color" to be "blue"/,
	);
});

test("hydrate={true} can be used to continue hydration", () => {
	container.innerHTML = `<button>Click</button>Hello`;
	const button = container.firstChild as HTMLButtonElement;
	renderer.hydrate(
		<Fragment>
			<button hydrate={true}>Click</button>
			Hello
		</Fragment>,
		container,
	);
	Assert.is(container.innerHTML, `<button>Click</button>Hello`);
	Assert.is(container.firstChild, button);
});

test("hydrate={false} can be used to disable hydration", () => {
	container.innerHTML = `Before <button id="server">Server</button>After`;
	const button = container.firstChild as HTMLButtonElement;
	renderer.hydrate(
		<Fragment>
			Before{" "}
			<button id="client" hydrate={false}>
				Client
			</button>
			After
		</Fragment>,
		container,
	);
	Assert.is(
		container.innerHTML,
		`Before <button id="client">Client</button>After`,
	);
	Assert.not(button === document.getElementById("client"));
	Assert.is(consoleWarn.callCount, 0);
});

test("portals are not hydrated by default", () => {
	container.innerHTML = `<div id="app">Before After</div><div id="portal"><button>Server</button></div>`;
	const app = document.getElementById("app")!;
	const portal = document.getElementById("portal")!;
	const button = portal.firstChild as HTMLButtonElement;
	const onclick = Sinon.fake();
	renderer.hydrate(
		<Fragment>
			Before{" "}
			<Portal root={portal}>
				<button onclick={onclick}>Client</button>
			</Portal>
			After
		</Fragment>,
		app,
	);
	Assert.is(
		container.innerHTML,
		`<div id="app">Before After</div><div id="portal"><button>Client</button><button>Server</button></div>`,
	);
	Assert.is(portal.innerHTML, `<button>Client</button><button>Server</button>`);
	button.click();
	Assert.is(onclick.callCount, 0);
	Assert.is(consoleWarn.callCount, 0);
});

test("hydrate={true} can be used to hydrate a nested portal", () => {
	const onclick = Sinon.fake();
	container.innerHTML = `<div id="app">Before After</div><div id="portal"><button>Click</button></div>`;
	const app = document.getElementById("app")!;
	const portal = document.getElementById("portal")!;
	const button = portal.firstChild as HTMLButtonElement;
	renderer.hydrate(
		<Fragment>
			{"Before "}
			<Portal root={portal} hydrate={true}>
				<button onclick={onclick}>Click</button>
			</Portal>
			After
		</Fragment>,
		app,
	);

	Assert.is(
		container.innerHTML,
		`<div id="app">Before After</div><div id="portal"><button>Click</button></div>`,
	);
	Assert.is(portal.firstChild, button);
	Assert.is(portal.innerHTML, `<button>Click</button>`);
	button.click();
	Assert.is(onclick.callCount, 1);
	Assert.is(consoleWarn.callCount, 0);
});

test("hydrate={true} can be used to start hydration", () => {
	const onclick = Sinon.fake();
	container.innerHTML = `<div id="portal"><button>Click</button></div>`;
	const portal = document.getElementById("portal")!;
	const button = portal.firstChild as HTMLButtonElement;
	renderer.render(
		<div id="app">
			Before{" "}
			<Portal root={portal} hydrate={true}>
				<button onclick={onclick}>Click</button>
			</Portal>
			After
		</div>,
		container,
	);

	Assert.is(
		container.innerHTML,
		`<div id="app">Before After</div><div id="portal"><button>Click</button></div>`,
	);
	Assert.is(portal.firstChild, button);
	Assert.is(portal.innerHTML, `<button>Click</button>`);
	button.click();
	Assert.is(onclick.callCount, 1);
	Assert.is(consoleWarn.callCount, 0);
});

test("hydrate={false} can be used to disable hydration for a fragment", () => {
	container.innerHTML = `<div id="app">Before <button>Click1</button> <button>Click2</button> After</div>`;
	const app = document.getElementById("app")!;
	const button1 = container.querySelector(
		"button:nth-child(1)",
	) as HTMLButtonElement;
	const button2 = container.querySelector(
		"button:nth-child(2)",
	) as HTMLButtonElement;
	renderer.hydrate(
		<Fragment>
			Before{" "}
			<Fragment hydrate={false}>
				<button>Click1</button> <button>Click2</button>
			</Fragment>{" "}
			After
		</Fragment>,
		app,
	);
	Assert.is(
		container.innerHTML,
		`<div id="app">Before <button>Click1</button> <button>Click2</button> After</div>`,
	);
	Assert.not(button1 === container.querySelector("button:nth-child(1)"));
	Assert.not(button2 === container.querySelector("button:nth-child(2)"));
	Assert.is(consoleWarn.callCount, 0);
});

test("hydrate={false} can be used to disable hydration for a component", () => {
	container.innerHTML = `<div id="app">Before <button>Click1</button> <button>Click2</button> After</div>`;
	const app = document.getElementById("app")!;
	const button1 = container.querySelector(
		"button:nth-child(1)",
	) as HTMLButtonElement;
	const button2 = container.querySelector(
		"button:nth-child(2)",
	) as HTMLButtonElement;

	function Component() {
		return (
			<Fragment>
				<button>Click1</button> <button>Click2</button>
			</Fragment>
		);
	}

	renderer.hydrate(
		<Fragment>
			Before <Component hydrate={false} /> After
		</Fragment>,
		app,
	);
	Assert.is(
		container.innerHTML,
		`<div id="app">Before <button>Click1</button> <button>Click2</button> After</div>`,
	);
	Assert.not(button1 === container.querySelector("button:nth-child(1)"));
	Assert.not(button2 === container.querySelector("button:nth-child(2)"));
	Assert.is(consoleWarn.callCount, 0);
});

test("hydrate={false} can be used to disable hydration for a Raw node", () => {
	container.innerHTML = `<div id="app">Before <button>Click1</button> <button>Click2</button> After</div>`;
	const app = document.getElementById("app")!;
	const button1 = container.querySelector(
		"button:nth-child(1)",
	) as HTMLButtonElement;
	const button2 = container.querySelector(
		"button:nth-child(2)",
	) as HTMLButtonElement;

	renderer.hydrate(
		<Fragment>
			Before{" "}
			<Raw
				value="<button>Click1</button> <button>Click2</button>"
				hydrate={false}
			/>{" "}
			After
		</Fragment>,
		app,
	);
	Assert.is(
		container.innerHTML,
		`<div id="app">Before <button>Click1</button> <button>Click2</button> After</div>`,
	);
	Assert.not(button1 === container.querySelector("button:nth-child(1)"));
	Assert.not(button2 === container.querySelector("button:nth-child(2)"));
	Assert.is(consoleWarn.callCount, 0);
});

test("hydrate={false} can be used to disable hydration for Text", () => {
	container.innerHTML = `<div id="app">Before <button>Click1</button> <button>Click2</button> After</div>`;
	const app = document.getElementById("app")!;
	const text1 = (
		container.querySelector("button:nth-child(1)") as HTMLButtonElement
	).firstChild as Text;
	const text2 = (
		container.querySelector("button:nth-child(2)") as HTMLButtonElement
	).firstChild as Text;

	renderer.hydrate(
		<Fragment>
			Before{" "}
			<button>
				<Text1 value="Click1" hydrate={false} />
			</button>{" "}
			<button>
				<Text1 value="Click2" hydrate={false} />
			</button>{" "}
			After
		</Fragment>,
		app,
	);
	Assert.is(
		container.innerHTML,
		`<div id="app">Before <button>Click1</button> <button>Click2</button> After</div>`,
	);
	Assert.not(
		text1 ===
			(container.querySelector("button:nth-child(1)") as HTMLButtonElement)
				.firstChild,
	);
	Assert.not(
		text2 ===
			(container.querySelector("button:nth-child(2)") as HTMLButtonElement)
				.firstChild,
	);
	Assert.is(consoleWarn.callCount, 0);
});

test("hydration meta-prop can suppress specific property warnings (exclusive)", () => {
	container.innerHTML = `<div id="server" class="old-class"></div>`;
	renderer.hydrate(
		<div id="client" class="new-class" hydrate="!id" />,
		container,
	);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "class" to be "new-class"/,
	);
});

test("hydration meta-prop can suppress multiple property warnings (exclusive)", () => {
	container.innerHTML = `<div id="server" class="old-class" data-test="old"></div>`;
	renderer.hydrate(
		<div id="client" class="new-class" data-test="new" hydrate="!id !class" />,
		container,
	);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "data-test" to be "new"/,
	);
});

test("hydration meta-prop can suppress all but specified property warnings (inclusive)", () => {
	container.innerHTML = `<div id="server" class="old-class" data-test="old"></div>`;
	renderer.hydrate(
		<div id="client" class="new-class" data-test="new" hydrate="id" />,
		container,
	);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "id" to be "client"/);
});

test("hydration meta-prop can suppress style property warnings", () => {
	container.innerHTML = `<div style="color: red; background: blue"></div>`;
	renderer.hydrate(
		<div style={{color: "green", background: "blue"}} hydrate="!style" />,
		container,
	);
	Assert.is(consoleWarn.callCount, 0);
});

test("hydration meta-prop with spaces and mixed syntax", () => {
	container.innerHTML = `<div id="server" class="old" data-foo="old" data-bar="old"></div>`;
	renderer.hydrate(
		<div
			id="client"
			class="new"
			data-foo="new"
			data-bar="new"
			hydrate="  !id   !class  "
		/>,
		container,
	);
	Assert.is(consoleWarn.callCount, 2);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "data-foo" to be "new"/,
	);
	Assert.match(
		consoleWarn.secondCall.args[0],
		/Expected "data-bar" to be "new"/,
	);
});

test("hydration meta-prop can disable children hydration with !children", () => {
	container.innerHTML = `<div><span>Server Content</span><button>Server Button</button></div>`;
	const serverSpan = container.querySelector("span") as HTMLSpanElement;
	const serverButton = container.querySelector("button") as HTMLButtonElement;

	const onclick = Sinon.fake();
	renderer.hydrate(
		<div hydrate="!children">
			<span>Client Content</span>
			<button onclick={onclick}>Client Button</button>
		</div>,
		container,
	);

	// Children should be fully re-rendered (not hydrated)
	Assert.is(
		container.innerHTML,
		`<div><span>Client Content</span><button>Client Button</button></div>`,
	);
	Assert.not(container.querySelector("span") === serverSpan);
	Assert.not(container.querySelector("button") === serverButton);

	// Event handlers should work (since it's client-rendered)
	const newButton = container.querySelector("button") as HTMLButtonElement;
	newButton.click();
	Assert.ok(onclick.called);
	Assert.is(onclick.callCount, 1);
	Assert.is(consoleWarn.callCount, 0);
});

test("hydration meta-prop inclusive mode shows warnings only for specified props", () => {
	container.innerHTML = `<div class="server" id="server"><span>Server Content</span></div>`;

	renderer.hydrate(
		<div class="client" id="client" hydrate="class">
			<span>Client Content</span>
		</div>,
		container,
	);

	// Only class should warn (specified in inclusive mode), id should be quiet
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "class" to be "client"/,
	);
	Assert.is(
		container.innerHTML,
		`<div class="client" id="client"><span>Client Content</span></div>`,
	);
});

test("warns when class object doesn't match server classes during hydration", () => {
	container.innerHTML = `<div class="server-class other-class"></div>`;
	renderer.hydrate(
		<div class={{"client-class": true, active: true}} />,
		container,
	);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "class" to be "client-class active"/,
	);
});

test("warns when class object expects missing class during hydration", () => {
	container.innerHTML = `<div class="existing"></div>`;
	renderer.hydrate(<div class={{existing: true, missing: true}} />, container);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "class" to be "existing missing"/,
	);
});

test("warns when class object encounters unexpected server class during hydration", () => {
	container.innerHTML = `<div class="expected unexpected"></div>`;
	renderer.hydrate(<div class={{expected: true}} />, container);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "class" to be "expected"/,
	);
});

test("no warning class object matches", () => {
	container.innerHTML = `<div class="active primary"></div>`;
	renderer.hydrate(
		<div class={{active: true, primary: true, disabled: false}} />,
		container,
	);
	Assert.is(consoleWarn.callCount, 0);
});

test("no warning when prop is a coerced number", () => {
	container.innerHTML = `<div tabindex="3"></div>`;
	renderer.hydrate(<div tabindex={3} />, container);

	Assert.is(consoleWarn.callCount, 0);
});

test.run();
