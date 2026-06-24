import {suite} from "uvu";
import * as Assert from "uvu/assert";
import {createElement, Context} from "../src/crank.js";
import {renderer} from "../src/html.js";
import {renderToStream} from "../src/html-stream.js";

const test = suite("html-stream");

function recordingStream() {
	const chunks: Array<string> = [];
	const writable = new WritableStream<string>({
		write(chunk) {
			chunks.push(chunk);
		},
	});
	return {writable, chunks, text: () => chunks.join("")};
}

const tick = () => new Promise((r) => setTimeout(r, 0));

test("sync output matches the string renderer", async () => {
	const el = (
		<div class="a">
			<span>hi</span>
			<input type="text" disabled />
		</div>
	);
	const {writable, text} = recordingStream();
	const result = renderToStream(el, writable);
	Assert.is(typeof result, "string");
	Assert.is(result, renderer.render(el));
	await tick();
	Assert.is(text(), result);
});

test("function and generator components render", async () => {
	function Greeting({name}: {name: string}) {
		return <p>Hello {name}</p>;
	}

	function* Counter(this: Context) {
		for ({} of this) {
			yield <span>0</span>;
		}
	}

	const el = (
		<div>
			<Greeting name="world" />
			<Counter />
		</div>
	);
	const {writable, text} = recordingStream();
	const result = await renderToStream(el, writable);
	Assert.is(result, "<div><p>Hello world</p><span>0</span></div>");
	await tick();
	Assert.is(text(), result);
});

test("provisions flow to descendants", async () => {
	function Child(this: Context) {
		return <b>{this.consume("token") as string}</b>;
	}

	function* Parent(this: Context) {
		this.provide("token", "V");
		for ({} of this) {
			yield <Child />;
		}
	}

	const result = await renderToStream(<Parent />, recordingStream().writable);
	Assert.is(result, "<b>V</b>");
});

test("streams the static shell before async content resolves", async () => {
	let resolveContent!: () => void;
	async function Content() {
		await new Promise<void>((r) => (resolveContent = r));
		return <p>async</p>;
	}

	const el = (
		<html>
			<head>
				<title>t</title>
			</head>
			<body>
				<Content />
			</body>
		</html>
	);

	const {writable, text} = recordingStream();
	const done = renderToStream(el, writable) as Promise<string>;

	// The eager walk flushes the shell up to <body> before Content resolves.
	await tick();
	Assert.ok(text().includes("<body>"), `shell not flushed: ${text()}`);
	Assert.not.ok(text().includes("async"));

	resolveContent();
	const result = await done;
	await tick();
	Assert.is(text(), result);
	Assert.ok(result.includes("<p>async</p>"));
	Assert.ok(
		result.startsWith("<html><head><title>t</title></head><body>"),
		result,
	);
});

test("async siblings stream in document order", async () => {
	const make = (ms: number, text: string) =>
		async function () {
			await new Promise((r) => setTimeout(r, ms));
			return <li>{text}</li>;
		};
	const A = make(40, "A");
	const B = make(10, "B");

	const el = (
		<ul>
			<A />
			<B />
			<li>C</li>
		</ul>
	);
	const result = await renderToStream(el, recordingStream().writable);
	Assert.is(result, "<ul><li>A</li><li>B</li><li>C</li></ul>");
});

test.run();
