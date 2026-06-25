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

test("an async component streams its shell before its async descendants", async () => {
	let resolveApp!: () => void;
	let resolveInner!: () => void;
	async function Inner() {
		await new Promise<void>((r) => (resolveInner = r));
		return <p>inner</p>;
	}

	// App is async: once its own body resolves it returns a shell containing
	// further async (Inner). The shell should flush before Inner resolves.
	async function App() {
		await new Promise<void>((r) => (resolveApp = r));
		return (
			<main>
				<h1>shell</h1>
				<Inner />
			</main>
		);
	}

	const {writable, text} = recordingStream();
	const done = renderer.render(<App />, writable);

	await tick();
	Assert.is(text(), "", "nothing should flush before App's body resolves");

	resolveApp();
	await tick();
	Assert.ok(
		text().includes("<h1>shell</h1>"),
		`App's shell should flush before Inner resolves: ${text()}`,
	);
	Assert.not.ok(text().includes("inner"));

	resolveInner();
	const result = await done;
	Assert.is(result, "<main><h1>shell</h1><p>inner</p></main>");
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

test("a throwing async component rejects the stream", async () => {
	async function Boom() {
		await new Promise((r) => setTimeout(r, 5));
		throw new Error("boom");
	}

	let err: Error | undefined;
	try {
		await renderer.render(
			<div>
				<Boom />
			</div>,
			recordingStream().writable,
		);
	} catch (e) {
		err = e as Error;
	}

	Assert.ok(err, "expected the stream to reject");
	Assert.is(err!.message, "boom");
});

test("a sync error boundary recovers during streaming", async () => {
	function Boom(): any {
		throw new Error("boom");
	}

	function* Boundary(this: Context) {
		for ({} of this) {
			try {
				yield <Boom />;
			} catch (_err) {
				yield <p>caught</p>;
			}
		}
	}

	// Synchronous recovery happens during the diff phase, before commitStream
	// walks Boundary's (already-recovered) children.
	const result = await renderer.render(
		<main>
			<Boundary />
		</main>,
		recordingStream().writable,
	);
	Assert.is(result, "<main><p>caught</p></main>");
});

// KNOWN LIMITATION: an *async* child that throws cannot be recovered by an
// error boundary mid-stream — by the time it rejects, the walk has already
// committed earlier siblings and descended past the boundary, so the recovered
// fallback can't replace it. The stream rejects instead (React solves this with
// abort-and-swap; out of scope here).
test("async error past a boundary rejects the stream (not yet recoverable)", async () => {
	async function Boom(): Promise<any> {
		await new Promise((r) => setTimeout(r, 5));
		throw new Error("boom");
	}

	function* Boundary(this: Context) {
		for ({} of this) {
			try {
				yield <Boom />;
			} catch (_err) {
				yield <p>caught</p>;
			}
		}
	}

	let err: Error | undefined;
	try {
		await renderer.render(
			<main>
				<Boundary />
			</main>,
			recordingStream().writable,
		);
	} catch (e) {
		err = e as Error;
	}

	Assert.ok(err, "expected the stream to reject");
	Assert.is(err!.message, "boom");
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
