import {describe, test, expect} from "@b9g/libuild/test";

import {createElement, Fragment, Portal, Raw} from "../src/crank.js";
import type {Children, Context} from "../src/crank.js";
import {Suspense} from "../src/async.js";
import {renderer} from "../src/html.js";

interface Recording {
	writable: WritableStream<string>;
	chunks: Array<{value: string; time: number}>;
	text(): string;
	timeOf(text: string): number;
	isClosed(): boolean;
	aborted(): unknown;
}

// A WritableStream which records each chunk and when it arrived.
function record(): Recording {
	const chunks: Array<{value: string; time: number}> = [];
	const start = Date.now();
	let closed = false;
	let aborted: unknown;
	const writable = new WritableStream<string>({
		write(value) {
			chunks.push({value, time: Date.now() - start});
		},
		close() {
			closed = true;
		},
		abort(reason) {
			aborted = reason;
		},
	});

	return {
		writable,
		chunks,
		text: () => chunks.map((c) => c.value).join(""),
		// The time at which the text was first in the stream.
		timeOf(text: string): number {
			let written = "";
			for (const chunk of chunks) {
				written += chunk.value;
				if (written.includes(text)) {
					return chunk.time;
				}
			}

			return Infinity;
		},
		isClosed: () => closed,
		aborted: () => aborted,
	};
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function Delay({
	ms,
	children,
}: {
	ms: number;
	children?: Children;
}): Promise<Children> {
	await delay(ms);
	return children;
}

describe("html streaming", () => {
	test("sync tree", async () => {
		const stream = record();
		const result = await renderer.render(
			<div>
				<span>Hello</span>
			</div>,
			stream.writable,
		);

		expect(result).toBe("<div><span>Hello</span></div>");
		expect(stream.text()).toBe("<div><span>Hello</span></div>");
		expect(stream.isClosed()).toBe(true);
	});

	test("stream matches the string for many shapes", async () => {
		function* Gen(this: Context): Generator<Children> {
			for ({} of this) {
				yield <b>gen</b>;
			}
		}

		async function* AsyncGen(this: Context): AsyncGenerator<Children> {
			for ({} of this) {
				await delay(1);
				yield <i>async gen</i>;
			}
		}

		const trees = () => [
			<div class="a" data-x="1">
				text &amp; {"<escaped>"}
			</div>,
			<input type="text" value="x" />,
			<div innerHTML="<b>raw</b>">ignored</div>,
			<div dangerouslySetInnerHTML={{__html: "<b>raw</b>"}}>
				<span>ignored</span>
			</div>,
			<style>{"a > b { color: red; }"}</style>,
			<script>{"if (a < b && c > d) {}</script>"}</script>,
			<script type="application/json">{'{"a": "</script>"}'}</script>,
			<Fragment>{["a", "b", "c"]}</Fragment>,
			<svg viewBox="0 0 1 1">
				<rect stroke-width="2" />
				<style>{"a > b {}"}</style>
			</svg>,
			<Fragment>
				<Raw value="<!DOCTYPE html>" />
				<html>
					<head>
						<title>Title</title>
					</head>
					<body>
						<Delay ms={1}>
							<main>main</main>
						</Delay>
					</body>
				</html>
			</Fragment>,
			<div>
				before
				<Portal root={{}}>
					<span>elsewhere</span>
				</Portal>
				after
			</div>,
			<div>
				<Delay ms={2}>
					<em>slow</em>
				</Delay>
				<Gen />
				<AsyncGen />
				<Delay ms={1}>
					<em>fast</em>
				</Delay>
			</div>,
			<ul>
				{[1, 2, 3].map((i) => (
					<li>
						<Delay ms={3 - i}>{i}</Delay>
					</li>
				))}
			</ul>,
		];

		const strings = await Promise.all(
			trees().map((tree) => renderer.render(tree)),
		);
		const streamed = trees();
		for (let i = 0; i < streamed.length; i++) {
			const stream = record();
			const result = await renderer.render(streamed[i], stream.writable);
			expect(result).toBe(strings[i]);
			expect(stream.text()).toBe(strings[i]);
			expect(stream.isClosed()).toBe(true);
		}
	});

	test("writes what comes before an async component without waiting", async () => {
		const stream = record();
		const p = renderer.render(
			<div id="shell">
				<h1>Title</h1>
				<Delay ms={100}>
					<span>slow</span>
				</Delay>
				<footer>footer</footer>
			</div>,
			stream.writable,
		);

		await delay(20);
		expect(stream.text()).toBe('<div id="shell"><h1>Title</h1>');
		const result = await p;
		expect(result).toBe(
			'<div id="shell"><h1>Title</h1><span>slow</span><footer>footer</footer></div>',
		);
		expect(stream.text()).toBe(result);
	});

	test("writes one chunk for each stretch which does not wait", async () => {
		const stream = record();
		await renderer.render(
			<div>
				<p>first</p>
				<Delay ms={20}>
					<b>slow</b>
				</Delay>
				<p>last</p>
			</div>,
			stream.writable,
		);

		expect(stream.chunks.map((chunk) => chunk.value)).toEqual([
			"<div><p>first</p>",
			"<b>slow</b><p>last</p></div>",
		]);
	});

	test("streams to a Node.js writable stream", async () => {
		const calls: Array<string> = [];
		const writable = {
			write(chunk: string, callback: (err?: Error | null) => void) {
				calls.push(chunk);
				callback();
			},
			end(callback: () => void) {
				calls.push("(end)");
				callback();
			},
			destroy(err: Error) {
				calls.push("(destroy " + err.message + ")");
			},
		};

		const result = renderer.render(
			<div>
				<h1>Title</h1>
				<Delay ms={20}>
					<p>slow</p>
				</Delay>
			</div>,
			writable,
		);
		await delay(5);
		expect(calls).toEqual(["<div><h1>Title</h1>"]);
		expect(await result).toBe("<div><h1>Title</h1><p>slow</p></div>");
		expect(calls).toEqual([
			"<div><h1>Title</h1>",
			"<p>slow</p></div>",
			"(end)",
		]);

		calls.length = 0;
		async function Boom(): Promise<never> {
			await delay(10);
			throw new Error("boom");
		}

		await Promise.resolve(
			renderer.render(
				<div>
					<Boom />
				</div>,
				writable,
			),
		).catch(() => {});
		expect(calls).toEqual(["<div>", "(destroy boom)"]);
	});

	test("streams through a Response", async () => {
		const {readable, writable} = new TextEncoderStream();
		const start = Date.now();
		const result = renderer.render(
			<html>
				<head>
					<title>Title</title>
				</head>
				<body>
					<Delay ms={60}>
						<p>slow</p>
					</Delay>
				</body>
			</html>,
			writable,
		);

		const response = new Response(readable, {
			headers: {"Content-Type": "text/html"},
		});
		const reader = response
			.body!.pipeThrough(new TextDecoderStream())
			.getReader();
		const first = await reader.read();
		expect(first.value).toBe("<html><head><title>Title</title></head><body>");
		expect(Date.now() - start).toBeLessThan(40);
		let text = first.value!;
		for (;;) {
			const {value, done} = await reader.read();
			if (done) {
				break;
			}

			text += value;
		}

		expect(text).toBe(await result);
		expect(text).toBe(
			"<html><head><title>Title</title></head><body><p>slow</p></body></html>",
		);
	});

	test("writes siblings in document order whatever order they settle in", async () => {
		const stream = record();
		const result = await renderer.render(
			<div>
				<Delay ms={80}>
					<span>A</span>
				</Delay>
				<Delay ms={10}>
					<span>B</span>
				</Delay>
			</div>,
			stream.writable,
		);

		expect(result).toBe("<div><span>A</span><span>B</span></div>");
		expect(stream.text()).toBe(result);
		// B settles first but is not written until A is.
		expect(stream.timeOf("<span>B</span>")).toBeGreaterThanOrEqual(70);
	});

	test("siblings start at once and children start when their parents settle", async () => {
		// The tree from the issue: delays start as soon as they are encountered,
		// so the render takes as long as its longest path, not the sum.
		const stream = record();
		const start = Date.now();
		const result = await renderer.render(
			<Fragment>
				<Delay ms={100}>
					a<Delay ms={100}>b</Delay>
				</Delay>
				<Delay ms={50}>
					c<Delay ms={50}>d</Delay>
					<Delay ms={200}>e</Delay>
				</Delay>
				f
			</Fragment>,
			stream.writable,
		);

		const elapsed = Date.now() - start;
		expect(result).toBe("abcdef");
		expect(stream.text()).toBe("abcdef");
		// The longest path is 50 + 200.
		expect(elapsed).toBeGreaterThanOrEqual(240);
		expect(elapsed).toBeLessThan(340);
		// a is written when its component settles, before its child does.
		expect(stream.timeOf("a")).toBeLessThan(180);
		expect(stream.timeOf("ab")).toBeGreaterThanOrEqual(190);
		// c and d have been ready since 50ms and 100ms, and are written with b.
		expect(stream.timeOf("abcd")).toBeLessThan(240);
		expect(stream.timeOf("abcde")).toBeGreaterThanOrEqual(240);
	});

	test("an async component is written before its async children settle", async () => {
		async function Layout({children}: {children: Children}) {
			await delay(20);
			return (
				<html>
					<head>
						<title>Title</title>
					</head>
					<body>{children}</body>
				</html>
			);
		}

		async function Page() {
			await delay(150);
			return <main>page</main>;
		}

		const stream = record();
		const p = renderer.render(
			<Layout>
				<Page />
			</Layout>,
			stream.writable,
		);

		await delay(70);
		expect(stream.text()).toBe("<html><head><title>Title</title></head><body>");
		const result = await p;
		expect(result).toBe(
			"<html><head><title>Title</title></head><body><main>page</main></body></html>",
		);
		expect(stream.text()).toBe(result);
	});

	test("components which do not wait do not hold their children back", async () => {
		function Sync({children}: {children: Children}) {
			return <section>{children}</section>;
		}

		function* Gen(this: Context, {children}: {children: Children}) {
			for ({children} of this) {
				yield <article>{children}</article>;
			}
		}

		const stream = record();
		const p = renderer.render(
			<Sync>
				<Gen>
					<p>first</p>
					<Delay ms={100}>
						<p>second</p>
					</Delay>
				</Gen>
			</Sync>,
			stream.writable,
		);

		await delay(20);
		expect(stream.text()).toBe("<section><article><p>first</p>");
		const result = await p;
		expect(result).toBe(
			"<section><article><p>first</p><p>second</p></article></section>",
		);
		expect(stream.text()).toBe(result);
	});

	test("held contents are written with the closing tag", async () => {
		const stream = record();
		const p = renderer.render(
			<head>
				<style>
					<Delay ms={50}>{"a > b {}"}</Delay>
				</style>
				<title>Title</title>
			</head>,
			stream.writable,
		);

		await delay(10);
		expect(stream.text()).toBe("<head><style>");
		const result = await p;
		expect(result).toBe(
			"<head><style>a > b {}</style><title>Title</title></head>",
		);
		expect(stream.text()).toBe(result);
	});

	test("a component which refreshes while the render waits", async () => {
		function* Counter(this: Context): Generator<Children> {
			let i = 0;
			setTimeout(() => this.refresh(() => i++), 10);
			for ({} of this) {
				yield (
					<div>
						<span>{i}</span>
						<Delay ms={60}>
							<b>slow {i}</b>
						</Delay>
					</div>
				);
			}
		}

		const tree = () => (
			<main>
				<h1>Title</h1>
				<Counter />
			</main>
		);

		const expected = await renderer.render(tree());
		const stream = record();
		const result = await renderer.render(tree(), stream.writable);
		expect(result).toBe(expected);
		expect(stream.text()).toBe(expected);
		expect(stream.isClosed()).toBe(true);
	});

	test("a component which refreshes before the render reaches it", async () => {
		function* Counter(this: Context): Generator<Children> {
			let i = 0;
			setTimeout(() => this.refresh(() => i++), 10);
			for ({} of this) {
				yield <span>{i}</span>;
			}
		}

		const tree = () => (
			<main>
				<Delay ms={60}>
					<b>slow</b>
				</Delay>
				<Counter />
			</main>
		);

		const expected = await renderer.render(tree());
		const stream = record();
		const result = await renderer.render(tree(), stream.writable);
		expect(result).toBe(expected);
		expect(stream.text()).toBe(expected);
		expect(stream.isClosed()).toBe(true);
	});

	test("a component which throws rejects the render and aborts the stream", async () => {
		async function Boom(): Promise<never> {
			await delay(10);
			throw new Error("boom");
		}

		const stream = record();
		let err: unknown;
		try {
			await renderer.render(
				<div>
					<h1>Title</h1>
					<Boom />
				</div>,
				stream.writable,
			);
		} catch (err1) {
			err = err1;
		}

		expect(err).toBeInstanceOf(Error);
		expect((err as Error).message).toBe("boom");
		expect(stream.text()).toBe("<div><h1>Title</h1>");
		expect(stream.isClosed()).toBe(false);
		expect((stream.aborted() as Error).message).toBe("boom");
	});

	test("a render which fails cleans up what it mounted", async () => {
		const cleanups: Array<string> = [];
		function* Mounted(
			this: Context,
			{name}: {name: string},
		): Generator<Children> {
			this.cleanup(() => cleanups.push(name));
			for ({} of this) {
				yield <h1>Title</h1>;
			}
		}

		async function Boom(): Promise<never> {
			await delay(10);
			throw new Error("boom");
		}

		const stream = record();
		await Promise.resolve(
			renderer.render(
				<div>
					<Mounted name="stream" />
					<Boom />
				</div>,
				stream.writable,
			),
		).catch(() => {});
		expect(cleanups).toEqual(["stream"]);

		await Promise.resolve(
			renderer.render(
				<div>
					<Mounted name="string" />
					<Boom />
				</div>,
			),
		).catch(() => {});
		expect(cleanups).toEqual(["stream", "string"]);
	});

	test("a component which recovers from a child error", async () => {
		async function Boom(): Promise<never> {
			await delay(10);
			throw new Error("boom");
		}

		function* Boundary(this: Context): Generator<Children> {
			for ({} of this) {
				try {
					yield <Boom />;
				} catch (err) {
					yield <p>recovered</p>;
				}
			}
		}

		const tree = () => (
			<div>
				<h1>Title</h1>
				<Boundary />
			</div>
		);

		const expected = await renderer.render(tree());
		expect(expected).toBe("<div><h1>Title</h1><p>recovered</p></div>");
		const stream = record();
		const result = await renderer.render(tree(), stream.writable);
		expect(result).toBe(expected);
		expect(stream.text()).toBe(expected);
	});

	test("concurrent renders into separate streams", async () => {
		const stream1 = record();
		const stream2 = record();
		const [result1, result2] = await Promise.all([
			renderer.render(
				<div>
					1<Delay ms={30}>one</Delay>
				</div>,
				stream1.writable,
			),
			renderer.render(
				<div>
					2<Delay ms={10}>two</Delay>
				</div>,
				stream2.writable,
			),
		]);

		expect(result1).toBe("<div>1one</div>");
		expect(stream1.text()).toBe(result1);
		expect(result2).toBe("<div>2two</div>");
		expect(stream2.text()).toBe(result2);
	});
});

// The test bundle is inlined in a script element, so the source cannot
// contain an opening or closing script tag.
const OPEN_SCRIPT = ["<", "script>"].join("");
const CLOSE_SCRIPT = ["<", "/script>"].join("");

// The script which replaces a fallback in browsers without <template for>
// is written with the first template, and called after each. This replaces
// each script with a marker.
function stripScripts(html: string): string {
	return html
		.split(OPEN_SCRIPT)
		.map((part, i) =>
			i === 0 ? part : "[script]" + part.slice(part.indexOf(CLOSE_SCRIPT) + 9),
		)
		.join("");
}

describe("html streaming suspense", () => {
	test("writes the fallback in place and the children after the document", async () => {
		const stream = record();
		const result = await renderer.render(
			<body>
				<h1>Title</h1>
				<Suspense fallback={<p>Loading</p>} timeout={10}>
					<Delay ms={60}>
						<ul>
							<li>Item</li>
						</ul>
					</Delay>
				</Suspense>
				<footer>Footer</footer>
			</body>,
			stream.writable,
		);

		expect(stripScripts(result)).toBe(
			'<body><h1>Title</h1><?start name="crank-0"><p>Loading</p><?end><footer>Footer</footer></body>' +
				'<template for="crank-0"><ul><li>Item</li></ul></template>[script]',
		);
		expect(stream.text()).toBe(result);
		expect(result).toContain('$crank("crank-0")' + CLOSE_SCRIPT);
		// The footer does not wait for the children.
		expect(stream.timeOf("<footer>")).toBeLessThan(45);
		expect(stream.timeOf("<template")).toBeGreaterThanOrEqual(55);
		expect(stream.isClosed()).toBe(true);
	});

	test("writes the children in place when they are ready before the fallback", async () => {
		const stream = record();
		const result = await renderer.render(
			<body>
				<Suspense fallback={<p>Loading</p>} timeout={60}>
					<Delay ms={10}>
						<p>Ready</p>
					</Delay>
				</Suspense>
				<footer>Footer</footer>
			</body>,
			stream.writable,
		);

		expect(result).toBe("<body><p>Ready</p><footer>Footer</footer></body>");
		expect(stream.text()).toBe(result);
	});

	test("writes sync children in place", async () => {
		const stream = record();
		const result = await renderer.render(
			<body>
				<Suspense fallback={<p>Loading</p>}>
					<p>Ready</p>
				</Suspense>
			</body>,
			stream.writable,
		);

		expect(result).toBe("<body><p>Ready</p></body>");
		expect(stream.text()).toBe(result);
	});

	test("writes templates in the order their children are ready", async () => {
		const stream = record();
		const result = await renderer.render(
			<body>
				<Suspense fallback="A?" timeout={5}>
					<Delay ms={80}>
						<b>A</b>
					</Delay>
				</Suspense>
				<Suspense fallback="B?" timeout={5}>
					<Delay ms={40}>
						<b>B</b>
					</Delay>
				</Suspense>
			</body>,
			stream.writable,
		);

		expect(stripScripts(result)).toBe(
			'<body><?start name="crank-0">A?<?end><?start name="crank-1">B?<?end></body>' +
				'<template for="crank-1"><b>B</b></template>[script]' +
				'<template for="crank-0"><b>A</b></template>[script]',
		);
		// The function which the scripts call is only defined once.
		expect(result.split("function $crank").length).toBe(2);
	});

	test("nested boundaries", async () => {
		const stream = record();
		const result = await renderer.render(
			<body>
				<Suspense fallback="outer?" timeout={5}>
					<Delay ms={40}>
						<b>outer</b>
						<Suspense fallback="inner?" timeout={5}>
							<Delay ms={40}>
								<i>inner</i>
							</Delay>
						</Suspense>
					</Delay>
				</Suspense>
			</body>,
			stream.writable,
		);

		expect(stripScripts(result)).toBe(
			'<body><?start name="crank-0">outer?<?end></body>' +
				'<template for="crank-0"><b>outer</b><?start name="crank-1">inner?<?end></template>[script]' +
				'<template for="crank-1"><i>inner</i></template>[script]',
		);
	});

	test("children which fail after the fallback has been written", async () => {
		async function Boom(): Promise<never> {
			await delay(40);
			throw new Error("boom");
		}

		const stream = record();
		let err: unknown;
		try {
			await renderer.render(
				<body>
					<Suspense fallback="Loading" timeout={5}>
						<Boom />
					</Suspense>
					<footer>Footer</footer>
				</body>,
				stream.writable,
			);
		} catch (err1) {
			err = err1;
		}

		// The document is complete, with the fallback left in place.
		expect((err as Error).message).toBe("boom");
		expect(stream.text()).toBe(
			'<body><?start name="crank-0">Loading<?end><footer>Footer</footer></body>',
		);
		expect(stream.isClosed()).toBe(true);
	});

	test("children which fail before the fallback has been written", async () => {
		async function Boom(): Promise<never> {
			await delay(10);
			throw new Error("boom");
		}

		const stream = record();
		let err: unknown;
		try {
			await renderer.render(
				<body>
					<Suspense fallback="Loading" timeout={60}>
						<Boom />
					</Suspense>
				</body>,
				stream.writable,
			);
		} catch (err1) {
			err = err1;
		}

		expect((err as Error).message).toBe("boom");
		expect(stream.text()).toBe("<body>");
		expect(stream.isClosed()).toBe(false);
		expect((stream.aborted() as Error).message).toBe("boom");
	});

	test("rendering to a string is unchanged", async () => {
		const result = await renderer.render(
			<body>
				<Suspense fallback="Loading" timeout={60}>
					<Delay ms={10}>
						<p>Ready</p>
					</Delay>
				</Suspense>
			</body>,
		);

		expect(result).toBe("<body><p>Ready</p></body>");
	});
});
