import {suite} from "uvu";
import * as Assert from "uvu/assert";

import {createElement, Portal} from "../src/crank.js";
import type {Context} from "../src/crank.js";
import {renderer} from "../src/html.js";

const test = suite("html-streaming");

function collector() {
	const chunks: Array<{chunk: string; t: number}> = [];
	const start = Date.now();
	return {
		write(chunk: string) {
			chunks.push({chunk, t: Date.now() - start});
		},
		chunks,
		text() {
			return chunks.map((c) => c.chunk).join("");
		},
	};
}

async function Slow(
	this: Context,
	{ms, children}: {ms: number; children?: unknown},
): Promise<any> {
	await new Promise((resolve) => setTimeout(resolve, ms));
	return <div class="slow">{children}</div>;
}

test("streams the full document and resolves to the same string", async () => {
	const sink = collector();
	const result = await renderer.render(
		<main>
			<header>Shell</header>
			<Slow ms={50}>Late</Slow>
		</main>,
		sink,
	);

	const expected =
		'<main><header>Shell</header><div class="slow">Late</div></main>';
	Assert.is(result, expected);
	Assert.is(sink.text(), expected);
});

test("flushes the shell before the async content resolves", async () => {
	const sink = collector();
	const result = await renderer.render(
		<main>
			<header>Shell</header>
			<Slow ms={100}>Late</Slow>
		</main>,
		sink,
	);

	// The shell (everything up to the unresolved <Slow>) must be written well
	// before the 100ms async settles.
	const shell = sink.chunks[0];
	Assert.ok(shell, "expected a shell chunk");
	Assert.ok(
		shell.chunk.startsWith("<main><header>Shell</header>"),
		`shell chunk was ${JSON.stringify(shell.chunk)}`,
	);
	Assert.ok(shell.t < 50, `shell flushed at ${shell.t}ms, expected < 50ms`);

	// And more than one flush happened (shell, then the async content).
	Assert.ok(sink.chunks.length >= 2, "expected an incremental second flush");
	Assert.is(
		result,
		'<main><header>Shell</header><div class="slow">Late</div></main>',
	);
});

test("two async siblings both stream in document order", async () => {
	const sink = collector();
	const result = await renderer.render(
		<ul>
			<Slow ms={40}>A</Slow>
			<Slow ms={20}>B</Slow>
		</ul>,
		sink,
	);

	Assert.is(
		result,
		'<ul><div class="slow">A</div><div class="slow">B</div></ul>',
	);
	Assert.is(sink.text(), result);
});

test("streams through a WritableStream and resolves to the string", async () => {
	const {readable, writable} = new TransformStream<string, string>();
	const reader = readable.getReader();
	const chunks: Array<string> = [];
	const drain = (async () => {
		for (;;) {
			const {done, value} = await reader.read();
			if (done) break;
			chunks.push(value);
		}
	})();

	const result = await renderer.render(
		<main>
			<header>Shell</header>
			<Slow ms={30}>Body</Slow>
		</main>,
		writable,
	);
	await drain;

	const expected =
		'<main><header>Shell</header><div class="slow">Body</div></main>';
	Assert.is(result, expected);
	Assert.is(chunks.join(""), expected);
	Assert.ok(chunks.length >= 2, "expected incremental writes");
});

test("portal children are excluded from the stream", async () => {
	const sink = collector();
	const result = await renderer.render(
		<div>
			Before
			<Portal root={{}}>
				<span>Inside portal</span>
			</Portal>
			After
		</div>,
		sink,
	);

	Assert.is(result, "<div>BeforeAfter</div>");
	Assert.is(sink.text(), result);
});

test("cleanup runs after a streaming render completes", async () => {
	let cleaned = false;
	function* Comp(this: Context) {
		try {
			while (true) {
				yield <span>x</span>;
			}
		} finally {
			cleaned = true;
		}
	}

	const sink = collector();
	await renderer.render(
		<div>
			<Comp />
			<Slow ms={20}>done</Slow>
		</div>,
		sink,
	);

	Assert.ok(cleaned, "generator cleanup should run on teardown");
});

test("a rejected async component rejects the render", async () => {
	async function Boom(): Promise<any> {
		throw new Error("boom");
	}

	const sink = collector();
	let error: Error | undefined;
	try {
		await renderer.render(
			<div>
				<Boom />
			</div>,
			sink,
		);
	} catch (err) {
		error = err as Error;
	}

	Assert.ok(error, "expected the render to reject");
	Assert.is(error!.message, "boom");
});

test.run();
