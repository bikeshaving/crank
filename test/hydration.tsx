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
test.before.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

let consoleWarn: Sinon.SinonStub;
test.before.each(() => {
	consoleWarn = Sinon.stub(console, "warn");
});

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
	consoleWarn.restore();
});

test("simple", () => {
	document.body.innerHTML = "<button>Click</button>";
	const button = document.body.firstChild as HTMLButtonElement;
	const onclick = Sinon.fake();
	renderer.hydrate(<button onclick={onclick}>Click</button>, document.body);

	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(document.body.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("fragment", () => {
	document.body.innerHTML = "<button>Click</button>";
	const button = document.body.firstChild as HTMLButtonElement;
	const onclick = Sinon.fake();
	renderer.hydrate(
		<Fragment>
			<button onclick={onclick}>Click</button>
		</Fragment>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(document.body.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("sync function component", () => {
	document.body.innerHTML = "<button>Click</button>";
	const button = document.body.firstChild as HTMLButtonElement;

	const onclick = Sinon.fake();
	const Component = Sinon.fake(function Component() {
		return <button onclick={onclick}>Click</button>;
	});

	renderer.hydrate(<Component />, document.body);

	Assert.ok(Component.called);
	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(document.body.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("sync generator component", () => {
	document.body.innerHTML = "<button>Click</button>";
	const button = document.body.firstChild as HTMLButtonElement;

	const onclick = Sinon.fake();
	const Component = Sinon.fake(function* Component(this: Context) {
		for ({} of this) {
			yield <button onclick={onclick}>Click</button>;
		}
	});

	renderer.hydrate(<Component />, document.body);

	Assert.ok(Component.called);
	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(document.body.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("refresh", () => {
	document.body.innerHTML = "<button>Click</button>";
	const button = document.body.firstChild as HTMLButtonElement;

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

	renderer.hydrate(<Component />, document.body);

	Assert.ok(Component.called);
	Assert.is(document.body.innerHTML, "<button>Click 0</button>");
	Assert.is(document.body.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(document.body.innerHTML, "<button>Click 1</button>");
	Assert.is(document.body.firstChild, button);
	Assert.is(consoleWarn.callCount, 2);
});

test("async function component", async () => {
	document.body.innerHTML = "<button>Click</button>";
	const button = document.body.firstChild as HTMLButtonElement;

	const onclick = Sinon.fake();
	const Component = Sinon.fake(async function Component() {
		return <button onclick={onclick}>Click</button>;
	});

	await renderer.hydrate(<Component />, document.body);

	Assert.ok(Component.called);
	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(document.body.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("async generator component", async () => {
	document.body.innerHTML = "<button>Click</button>";
	const button = document.body.firstChild as HTMLButtonElement;

	const onclick = Sinon.fake();
	const Component = Sinon.fake(async function* Component(this: Context) {
		for await ({} of this) {
			yield <button onclick={onclick}>Click</button>;
		}
	});

	await renderer.hydrate(<Component />, document.body);

	Assert.ok(Component.called);
	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(document.body.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("async component and host sibling", async () => {
	document.body.innerHTML =
		"<div><div><button>Slow</button></div><button>Fast</button></div>";
	const div = document.body.firstChild!;
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
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><div><button>Slow</button></div><button>Fast</button></div>",
	);
	Assert.is(document.body.firstChild, div);
	Assert.is(document.body.firstChild!.childNodes[0].childNodes[0], button1);
	Assert.is(document.body.firstChild!.childNodes[1], button2);
	button1.click();
	button2.click();
	Assert.ok(onclick1.called);
	Assert.ok(onclick2.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("async sibling components resolve out of order", async () => {
	document.body.innerHTML =
		"<div><button>Slow</button><button>Fast</button></div>";
	const div = document.body.firstChild!;
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

	await renderer.hydrate(<Component />, document.body);
	Assert.is(
		document.body.innerHTML,
		"<div><button>Slow</button><button>Fast</button></div>",
	);

	Assert.is(document.body.firstChild, div);
	Assert.is(document.body.firstChild!.childNodes[0], button1);
	Assert.is(document.body.firstChild!.childNodes[1], button2);
	button1.click();
	button2.click();
	Assert.ok(onclick1.called);
	Assert.ok(onclick2.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("text sibling", async () => {
	document.body.innerHTML = "<div>Text1<button>Click</button>Text2</div>";
	const div = document.body.firstChild!;
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
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		"<div>Text1<button>Click</button>Text2</div>",
	);

	Assert.is(document.body.firstChild, div);
	Assert.is(document.body.firstChild!.childNodes[0], text1);
	Assert.is(document.body.firstChild!.childNodes[1], button);
	Assert.is(document.body.firstChild!.childNodes[2], text2);
	Assert.is(consoleWarn.callCount, 0);
});

test("split text", async () => {
	document.body.innerHTML = "<div>Text1Text2<button>Click</button></div>";
	const div = document.body.firstChild!;
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
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		"<div>Text1Text2<button>Click</button></div>",
	);

	Assert.is(document.body.firstChild, div);
	Assert.is(document.body.firstChild!.childNodes[0], text);
	Assert.is(document.body.firstChild!.childNodes[1].nodeType, Node.TEXT_NODE);
	Assert.is(document.body.firstChild!.childNodes[2], button);
	Assert.is(consoleWarn.callCount, 0);
});

test("mismatched tag", () => {
	document.body.innerHTML = "<div>Hello</div>";
	const onclick = Sinon.fake();
	const Component = Sinon.fake(function () {
		return <button onclick={onclick}>Click</button>;
	});

	renderer.hydrate(<Component />, document.body);
	Assert.ok(Component.called);
	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(consoleWarn.callCount, 1);
});

test("mismatched text", () => {
	document.body.innerHTML = "<button>Do not click</button>";
	const button = document.body.firstChild as HTMLButtonElement;
	const onclick = Sinon.fake();

	const Component = Sinon.fake(function () {
		return <button onclick={onclick}>Click</button>;
	});

	renderer.hydrate(<Component />, document.body);
	Assert.ok(Component.called);
	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(document.body.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 1);
});

test("missing element", () => {
	function Component() {
		return <button>Click</button>;
	}

	renderer.hydrate(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(consoleWarn.callCount, 1);
});

test("raw element", () => {
	document.body.innerHTML = "<div><div>Raw</div><button>Click</button></div>";
	const onclick = Sinon.fake();
	const button = document.body.childNodes[0].childNodes[1] as HTMLButtonElement;
	const Component = Sinon.fake(function () {
		return (
			<div>
				<Raw value="<div>Raw</div>" />
				<button onclick={onclick}>Click</button>
			</div>
		);
	});

	renderer.hydrate(<Component />, document.body);
	Assert.ok(Component.called);
	Assert.is(
		document.body.innerHTML,
		"<div><div>Raw</div><button>Click</button></div>",
	);
	Assert.is(document.body.childNodes[0].childNodes[1], button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("raw multiple elements", () => {
	document.body.innerHTML =
		"<div><div>Raw 1</div><div>Raw 2</div><button>Click</button></div>";
	const onclick = Sinon.fake();
	const button = document.body.childNodes[0].childNodes[2] as HTMLButtonElement;
	const Component = Sinon.fake(function () {
		return (
			<div>
				<Raw value="<div>Raw 1</div><div>Raw 2</div>" />
				<button onclick={onclick}>Click</button>
			</div>
		);
	});

	renderer.hydrate(<Component />, document.body);
	Assert.ok(Component.called);
	Assert.is(
		document.body.innerHTML,
		"<div><div>Raw 1</div><div>Raw 2</div><button>Click</button></div>",
	);
	Assert.is(document.body.childNodes[0].childNodes[2], button);
	button.click();
	Assert.ok(onclick.called);
});

test("raw text", () => {
	document.body.innerHTML = "<div>Raw<button>Click</button></div>";
	const onclick = Sinon.fake();
	const button = document.body.childNodes[0].childNodes[1] as HTMLButtonElement;
	const Component = Sinon.fake(function () {
		return (
			<div>
				<Raw value="Raw" />
				<button onclick={onclick}>Click</button>
			</div>
		);
	});

	renderer.hydrate(<Component />, document.body);
	Assert.ok(Component.called);
	Assert.is(document.body.innerHTML, "<div>Raw<button>Click</button></div>");
	Assert.is(document.body.childNodes[0].childNodes[1], button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("raw comment", () => {
	document.body.innerHTML =
		"<div><!-- comment -->Hello<button>Click</button></div>";
	const onclick = Sinon.fake();
	const button = document.body.childNodes[0].childNodes[2] as HTMLButtonElement;
	const Component = Sinon.fake(function () {
		return (
			<div>
				<Raw value="<!-- comment -->" />
				Hello
				<button onclick={onclick}>Click</button>
			</div>
		);
	});

	renderer.hydrate(<Component />, document.body);
	Assert.ok(Component.called);
	Assert.is(
		document.body.innerHTML,
		"<div><!-- comment -->Hello<button>Click</button></div>",
	);

	Assert.is(document.body.childNodes[0].childNodes[2], button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("ref called with hydrated element", () => {
	document.body.innerHTML = "<button>Click</button>";
	const button = document.body.firstChild as HTMLButtonElement;
	const ref = Sinon.fake();
	const onclick = Sinon.fake();

	renderer.hydrate(
		<button ref={ref} onclick={onclick}>
			Click
		</button>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(document.body.firstChild, button);
	Assert.ok(ref.calledOnce);
	Assert.is(ref.lastCall.firstArg, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleWarn.callCount, 0);
});

test("warns when attribute present but should be missing during hydration", () => {
	document.body.innerHTML = `<div foo="bar"></div>`;
	renderer.hydrate(<div foo={null} />, document.body);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "foo" to be missing/);
});

test("warns when attribute missing but should be present during hydration", () => {
	document.body.innerHTML = `<div></div>`;
	renderer.hydrate(<div foo={true} />, document.body);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "foo" to be ""/);
});

test("warns when attribute value mismatches during hydration", () => {
	document.body.innerHTML = `<div foo="baz"></div>`;
	renderer.hydrate(<div foo="bar" />, document.body);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "foo" to be "bar"/);
});

test("warns when style present but should be missing during hydration", () => {
	document.body.innerHTML = `<div style="color: red"></div>`;
	renderer.hydrate(<div style={null} />, document.body);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "style" to be missing/);
});

test.skip("warns when style should be empty string during hydration", () => {
	document.body.innerHTML = `<div style="color: red"></div>`;
	renderer.hydrate(<div style="" />, document.body);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "style" to be ""/);
});

test.skip("warns when style value mismatches during hydration", () => {
	document.body.innerHTML = `<div style="color: red"></div>`;
	renderer.hydrate(<div style="color: blue" />, document.body);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "style" to be "color: blue"/,
	);
});

test("warns when class present but should be missing during hydration", () => {
	document.body.innerHTML = `<div class="foo"></div>`;
	renderer.hydrate(<div class={null} />, document.body);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "class" to be missing/);
});

test("warns when class should be empty string during hydration", () => {
	document.body.innerHTML = `<div class="foo"></div>`;
	renderer.hydrate(<div class="" />, document.body);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "class" to be ""/);
});

test("warns when class value mismatches during hydration", () => {
	document.body.innerHTML = `<div class="foo"></div>`;
	renderer.hydrate(<div class="bar" />, document.body);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "class" to be "bar"/);
});

test("warns when innerHTML mismatches during hydration", () => {
	document.body.innerHTML = `<div>baz</div>`;
	renderer.hydrate(<div innerHTML="bar" />, document.body);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "innerHTML" to be "bar"/,
	);
});

test("warns when style property present but should be missing during hydration", () => {
	document.body.innerHTML = `<div style="color: red"></div>`;
	renderer.hydrate(<div style={{color: null}} />, document.body);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "style\.color" to be missing/,
	);
});

test("warns when id mismatches during hydration", () => {
	document.body.innerHTML = `<div id="server"></div>`;
	renderer.hydrate(<div id="client" />, document.body);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "id" to be "client"/);
});

test("warns when input type and value mismatches during hydration", () => {
	document.body.innerHTML = `<input type="email" value="server">`;
	renderer.hydrate(<input type="text" value="client" />, document.body);
	Assert.is(consoleWarn.callCount, 2);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "type" to be "text"/);
	Assert.match(
		consoleWarn.secondCall.args[0],
		/Expected "value" to be "client"/,
	);
});

test.skip("warns when style property value mismatches during hydration", () => {
	document.body.innerHTML = `<div style="color: red"></div>`;
	renderer.hydrate(<div style={{color: "blue"}} />, document.body);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "style\.color" to be "blue"/,
	);
});

test("hydrate={true} can be used to continue hydration", () => {
	document.body.innerHTML = `<button>Click</button>Hello`;
	const button = document.body.firstChild as HTMLButtonElement;
	renderer.hydrate(
		<Fragment>
			<button hydrate={true}>Click</button>
			Hello
		</Fragment>,
		document.body,
	);
	Assert.is(document.body.innerHTML, `<button>Click</button>Hello`);
	Assert.is(document.body.firstChild, button);
});

test("hydrate={false} can be used to disable hydration", () => {
	document.body.innerHTML = `Before <button id="server">Server</button>After`;
	const button = document.body.firstChild as HTMLButtonElement;
	renderer.hydrate(
		<Fragment>
			Before{" "}
			<button id="client" hydrate={false}>
				Client
			</button>
			After
		</Fragment>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		`Before <button id="client">Client</button>After`,
	);
	Assert.not(button === document.getElementById("client"));
	Assert.is(consoleWarn.callCount, 0);
});

test("portals are not hydrated by default", () => {
	document.body.innerHTML = `<div id="app">Before After</div><div id="portal"><button>Server</button></div>`;
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
		document.body.innerHTML,
		`<div id="app">Before After</div><div id="portal"><button>Client</button><button>Server</button></div>`,
	);
	Assert.is(portal.innerHTML, `<button>Client</button><button>Server</button>`);
	button.click();
	Assert.is(onclick.callCount, 0);
	Assert.is(consoleWarn.callCount, 0);
});

test("hydrate={true} can be used to hydrate a nested portal", () => {
	const onclick = Sinon.fake();
	document.body.innerHTML = `<div id="app">Before After</div><div id="portal"><button>Click</button></div>`;
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
		document.body.innerHTML,
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
	document.body.innerHTML = `<div id="portal"><button>Click</button></div>`;
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
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		`<div id="app">Before After</div><div id="portal"><button>Click</button></div>`,
	);
	Assert.is(portal.firstChild, button);
	Assert.is(portal.innerHTML, `<button>Click</button>`);
	button.click();
	Assert.is(onclick.callCount, 1);
	Assert.is(consoleWarn.callCount, 0);
});

test("hydrate={false} can be used to disable hydration for a fragment", () => {
	document.body.innerHTML = `<div id="app">Before <button>Click1</button> <button>Click2</button> After</div>`;
	const app = document.getElementById("app")!;
	const button1 = document.body.querySelector(
		"button:nth-child(1)",
	) as HTMLButtonElement;
	const button2 = document.body.querySelector(
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
		document.body.innerHTML,
		`<div id="app">Before <button>Click1</button> <button>Click2</button> After</div>`,
	);
	Assert.not(button1 === document.body.querySelector("button:nth-child(1)"));
	Assert.not(button2 === document.body.querySelector("button:nth-child(2)"));
	Assert.is(consoleWarn.callCount, 0);
});

test("hydrate={false} can be used to disable hydration for a component", () => {
	document.body.innerHTML = `<div id="app">Before <button>Click1</button> <button>Click2</button> After</div>`;
	const app = document.getElementById("app")!;
	const button1 = document.body.querySelector(
		"button:nth-child(1)",
	) as HTMLButtonElement;
	const button2 = document.body.querySelector(
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
		document.body.innerHTML,
		`<div id="app">Before <button>Click1</button> <button>Click2</button> After</div>`,
	);
	Assert.not(button1 === document.body.querySelector("button:nth-child(1)"));
	Assert.not(button2 === document.body.querySelector("button:nth-child(2)"));
	Assert.is(consoleWarn.callCount, 0);
});

test("hydrate={false} can be used to disable hydration for a Raw node", () => {
	document.body.innerHTML = `<div id="app">Before <button>Click1</button> <button>Click2</button> After</div>`;
	const app = document.getElementById("app")!;
	const button1 = document.body.querySelector(
		"button:nth-child(1)",
	) as HTMLButtonElement;
	const button2 = document.body.querySelector(
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
		document.body.innerHTML,
		`<div id="app">Before <button>Click1</button> <button>Click2</button> After</div>`,
	);
	Assert.not(button1 === document.body.querySelector("button:nth-child(1)"));
	Assert.not(button2 === document.body.querySelector("button:nth-child(2)"));
	Assert.is(consoleWarn.callCount, 0);
});

test("hydrate={false} can be used to disable hydration for Text", () => {
	document.body.innerHTML = `<div id="app">Before <button>Click1</button> <button>Click2</button> After</div>`;
	const app = document.getElementById("app")!;
	const text1 = (
		document.body.querySelector("button:nth-child(1)") as HTMLButtonElement
	).firstChild as Text;
	const text2 = (
		document.body.querySelector("button:nth-child(2)") as HTMLButtonElement
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
		document.body.innerHTML,
		`<div id="app">Before <button>Click1</button> <button>Click2</button> After</div>`,
	);
	Assert.not(
		text1 ===
			(document.body.querySelector("button:nth-child(1)") as HTMLButtonElement)
				.firstChild,
	);
	Assert.not(
		text2 ===
			(document.body.querySelector("button:nth-child(2)") as HTMLButtonElement)
				.firstChild,
	);
	Assert.is(consoleWarn.callCount, 0);
});

test("hydration meta-prop can suppress specific property warnings (exclusive)", () => {
	document.body.innerHTML = `<div id="server" class="old-class"></div>`;
	renderer.hydrate(
		<div id="client" class="new-class" hydrate="!id" />,
		document.body,
	);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "class" to be "new-class"/,
	);
});

test("hydration meta-prop can suppress multiple property warnings (exclusive)", () => {
	document.body.innerHTML = `<div id="server" class="old-class" data-test="old"></div>`;
	renderer.hydrate(
		<div id="client" class="new-class" data-test="new" hydrate="!id !class" />,
		document.body,
	);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "data-test" to be "new"/,
	);
});

test("hydration meta-prop can suppress all but specified property warnings (inclusive)", () => {
	document.body.innerHTML = `<div id="server" class="old-class" data-test="old"></div>`;
	renderer.hydrate(
		<div id="client" class="new-class" data-test="new" hydrate="id" />,
		document.body,
	);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(consoleWarn.firstCall.args[0], /Expected "id" to be "client"/);
});

test("hydration meta-prop can suppress style property warnings", () => {
	document.body.innerHTML = `<div style="color: red; background: blue"></div>`;
	renderer.hydrate(
		<div style={{color: "green", background: "blue"}} hydrate="!style" />,
		document.body,
	);
	Assert.is(consoleWarn.callCount, 0);
});

test("hydration meta-prop with spaces and mixed syntax", () => {
	document.body.innerHTML = `<div id="server" class="old" data-foo="old" data-bar="old"></div>`;
	renderer.hydrate(
		<div
			id="client"
			class="new"
			data-foo="new"
			data-bar="new"
			hydrate="  !id   !class  "
		/>,
		document.body,
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
	document.body.innerHTML = `<div><span>Server Content</span><button>Server Button</button></div>`;
	const serverSpan = document.body.querySelector("span") as HTMLSpanElement;
	const serverButton = document.body.querySelector(
		"button",
	) as HTMLButtonElement;

	const onclick = Sinon.fake();
	renderer.hydrate(
		<div hydrate="!children">
			<span>Client Content</span>
			<button onclick={onclick}>Client Button</button>
		</div>,
		document.body,
	);

	// Children should be fully re-rendered (not hydrated)
	Assert.is(
		document.body.innerHTML,
		`<div><span>Client Content</span><button>Client Button</button></div>`,
	);
	Assert.not(document.body.querySelector("span") === serverSpan);
	Assert.not(document.body.querySelector("button") === serverButton);

	// Event handlers should work (since it's client-rendered)
	const newButton = document.body.querySelector("button") as HTMLButtonElement;
	newButton.click();
	Assert.ok(onclick.called);
	Assert.is(onclick.callCount, 1);
	Assert.is(consoleWarn.callCount, 0);
});

test("hydration meta-prop inclusive mode shows warnings only for specified props", () => {
	document.body.innerHTML = `<div class="server" id="server"><span>Server Content</span></div>`;

	renderer.hydrate(
		<div class="client" id="client" hydrate="class">
			<span>Client Content</span>
		</div>,
		document.body,
	);

	// Only class should warn (specified in inclusive mode), id should be quiet
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "class" to be "client"/,
	);
	Assert.is(
		document.body.innerHTML,
		`<div class="client" id="client"><span>Client Content</span></div>`,
	);
});

test("warns when class object doesn't match server classes during hydration", () => {
	document.body.innerHTML = `<div class="server-class other-class"></div>`;
	renderer.hydrate(
		<div class={{"client-class": true, active: true}} />,
		document.body,
	);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "class" to be "client-class active"/,
	);
});

test("warns when class object expects missing class during hydration", () => {
	document.body.innerHTML = `<div class="existing"></div>`;
	renderer.hydrate(
		<div class={{existing: true, missing: true}} />,
		document.body,
	);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "class" to be "existing missing"/,
	);
});

test("warns when class object encounters unexpected server class during hydration", () => {
	document.body.innerHTML = `<div class="expected unexpected"></div>`;
	renderer.hydrate(<div class={{expected: true}} />, document.body);
	Assert.is(consoleWarn.callCount, 1);
	Assert.match(
		consoleWarn.firstCall.args[0],
		/Expected "class" to be "expected"/,
	);
});

test("no warning class object matches", () => {
	document.body.innerHTML = `<div class="active primary"></div>`;
	renderer.hydrate(
		<div class={{active: true, primary: true, disabled: false}} />,
		document.body,
	);
	Assert.is(consoleWarn.callCount, 0);
});

test("no warning when prop is a coerced number", () => {
	document.body.innerHTML = `<div tabindex="3"></div>`;
	renderer.hydrate(<div tabindex={3} />, document.body);

	Assert.is(consoleWarn.callCount, 0);
});

test.run();
