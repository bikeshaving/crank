import {suite} from "uvu";
import * as Assert from "uvu/assert";
import {createElement, Fragment, Context} from "../src/crank.js";
import {renderer} from "../src/html.js";
import {
	renderToStream,
	renderToString,
	renderWalk,
	type ExitInfo,
} from "../src/html-stream.js";

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

// --- atomic parity: onExit/return channel === today's string renderer ---

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
	test(`atomic walk matches the string renderer: ${name}`, () => {
		Assert.is(renderToString(el), renderer.render(el));
	});
}

test("atomic walk matches the string renderer: async", async () => {
	const el = (
		<main>
			<Async />
			<p>after</p>
		</main>
	);
	Assert.is(await renderToString(el), await renderer.render(el));
});

// --- onExit is the per-subtree commit point (the DOM/arrange channel) ---

test("onExit fires children before parents, siblings in document order", () => {
	const exits: Array<ExitInfo> = [];
	const el = (
		<div>
			<span>hi</span>
			<b>x</b>
		</div>
	);
	const html = renderWalk(
		el,
		() => {},
		(info) => exits.push(info),
	);

	Assert.is(html, "<div><span>hi</span><b>x</b></div>");
	// span and b commit before their parent div; siblings in order.
	Assert.equal(
		exits.map((e) => e.tag),
		["span", "b", "div"],
	);
	// each carries its fully assembled subtree html (arrange input).
	Assert.is(exits[0].html, "<span>hi</span>");
	Assert.is(exits[1].html, "<b>x</b>");
	Assert.is(exits[2].html, "<div><span>hi</span><b>x</b></div>");
});

test("a DOM-style onExit consumer can rebuild the document from commits", () => {
	// Ignore onEnter entirely; act only on completion points, as the DOM would.
	const committed: Record<string, string> = {};
	let last = "";
	renderWalk(
		<article>
			<h1>title</h1>
			<p>body</p>
		</article>,
		() => {},
		(info) => {
			committed[info.tag] = info.html;
			last = info.html;
		},
	);

	Assert.is(committed.h1, "<h1>title</h1>");
	Assert.is(committed.p, "<p>body</p>");
	Assert.is(last, "<article><h1>title</h1><p>body</p></article>");
});

// --- streaming: the same walk, flushing onEnter early ---

test("function and generator components render", async () => {
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
