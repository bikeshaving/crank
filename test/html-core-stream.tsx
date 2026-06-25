import {suite} from "uvu";
import * as Assert from "uvu/assert";
import {createElement, Fragment, Context} from "../src/crank.js";
import {renderer} from "../src/html.js";

// These exercise the REAL HTMLRenderer streaming path through the core: the
// polymorphic render() dispatches on a writable sink / Response into
// renderRootStream -> commitStream. Not the standalone prototype.

const test = suite("html-core-stream");

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

function Greeting({name}: {name: string}) {
	return <p>Hello {name}</p>;
}

function* Counter(this: Context) {
	for ({} of this) {
		yield <span>0</span>;
	}
}

async function Async() {
	await new Promise((r) => setTimeout(r, 5));
	return <em>async</em>;
}

const cases: Record<string, any> = {
	"host + attrs + text": (
		<div class="a" id="x">
			<span>hi &amp; bye</span>
			<input type="text" disabled />
		</div>
	),
	"void + innerHTML": (
		<div>
			<br />
			<p innerHTML="<b>raw</b>" />
			<img src="/x.png" alt="x" />
		</div>
	),
	fragment: (
		<Fragment>
			<li>a</li>
			<li>b</li>
		</Fragment>
	),
	svg: (
		<svg viewBox="0 0 1 1">
			<rect width="1" height="1" />
		</svg>
	),
	"function component": (
		<ul>
			<Greeting name="world" />
		</ul>
	),
	"generator component": (
		<div>
			<Counter />
		</div>
	),
	nested: (
		<section>
			<header>
				<h1>t</h1>
			</header>
			<div>{["x", "y", "z"].map((c) => <i key={c}>{c}</i>)}</div>
		</section>
	),
};

for (const [name, el] of Object.entries(cases)) {
	test(`streamed output matches renderer.render: ${name}`, async () => {
		const result = await renderer.render(el, recordingStream().writable);
		Assert.is(result, renderer.render(el) as string);
	});
}

test("streamed output matches renderer.render: async", async () => {
	const el = (
		<main>
			<Async />
			<p>after</p>
		</main>
	);
	const result = await renderer.render(el, recordingStream().writable);
	Assert.is(result, await (renderer.render(el) as Promise<string>));
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
	const done = renderer.render(el, writable);

	await tick();
	Assert.ok(text().includes("<body>"), `shell not flushed: ${text()}`);
	Assert.not.ok(text().includes("async"));

	resolveContent();
	const result = await done;
	Assert.ok(result.includes("<p>async</p>"));
	Assert.is(result, text());
	Assert.ok(
		result.startsWith("<html><head><title>t</title></head><body>"),
		result,
	);
});

test("a sync component wrapping the shell still streams it early", async () => {
	let resolveContent!: () => void;
	async function Content() {
		await new Promise<void>((r) => (resolveContent = r));
		return <p>async</p>;
	}

	// The canonical renderStream(<App/>) case: App is a sync component returning
	// the whole document, with async content nested inside.
	function App() {
		return (
			<html>
				<head>
					<title>t</title>
				</head>
				<body>
					<Content />
				</body>
			</html>
		);
	}

	const {writable, text} = recordingStream();
	const done = renderer.render(<App />, writable);

	await tick();
	Assert.ok(text().includes("<body>"), `shell not flushed: ${text()}`);
	Assert.not.ok(text().includes("async"));

	resolveContent();
	const result = await done;
	Assert.is(result, text());
	Assert.is(
		result,
		"<html><head><title>t</title></head><body><p>async</p></body></html>",
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
	const result = await renderer.render(el, recordingStream().writable);
	Assert.is(result, "<ul><li>A</li><li>B</li><li>C</li></ul>");
});

test("render(el, new Response()) returns a streaming Response", async () => {
	function App() {
		return (
			<html>
				<body>
					<h1>hi</h1>
				</body>
			</html>
		);
	}

	const res = renderer.render(<App />, new Response(null, {status: 201}));
	Assert.instance(res, Response);
	Assert.is(res.status, 201);
	Assert.is(res.headers.get("content-type"), "text/html; charset=utf-8");
	Assert.is(await res.text(), "<html><body><h1>hi</h1></body></html>");
});

test("render(el, Response) preserves an explicit content-type", async () => {
	const res = renderer.render(
		<p>x</p>,
		new Response(null, {headers: {"content-type": "application/xhtml+xml"}}),
	);
	Assert.is(res.headers.get("content-type"), "application/xhtml+xml");
	Assert.is(await res.text(), "<p>x</p>");
});

test.run();
