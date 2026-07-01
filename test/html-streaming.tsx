import {suite} from "uvu";
import * as Assert from "uvu/assert";

import {createElement} from "../src/crank.js";
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

test.run();
