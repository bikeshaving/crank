import {suite} from "uvu";
import * as Assert from "uvu/assert";

import {createElement, Fragment} from "../src/crank.js";
import type {Context} from "../src/crank.js";
import {renderer} from "../src/html.js";

const test = suite("html streaming");

// A minimal WritableStream that records each chunk and the time it arrived, so
// tests can assert both document order and that the shell flushed early.
function recordingStream() {
	const chunks: Array<{value: string; time: number}> = [];
	const start = Date.now();
	const writable = new WritableStream<string>({
		write(value) {
			chunks.push({value, time: Date.now() - start});
		},
	});

	return {
		writable,
		chunks,
		text: () => chunks.map((c) => c.value).join(""),
	};
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

test("resolves to the full string and streams it", async () => {
	const sink = recordingStream();
	const result = await renderer.render(
		<div>
			<span>Hello</span>
		</div>,
		sink.writable as any,
	);

	Assert.is(result, "<div><span>Hello</span></div>");
	Assert.is(sink.text(), "<div><span>Hello</span></div>");
});

test("byte-identical to the atomic render across many shapes", async () => {
	async function Async({message}: {message: string}) {
		await delay(1);
		return <em>{message}</em>;
	}

	function* Gen(this: Context) {
		while (true) {
			yield <b>gen</b>;
		}
	}

	const trees = [
		<div class="a" data-x="1">
			text
		</div>,
		<input type="text" value="x" />,
		<div innerHTML="<b>raw</b>" />,
		<Fragment>{["a", "b", "c"]}</Fragment>,
		<svg viewBox="0 0 1 1">
			<rect />
		</svg>,
		<div>
			<Async message="hi" />
			<Gen />
		</div>,
		<ul>
			{[1, 2, 3].map((i) => (
				<li>{i}</li>
			))}
		</ul>,
	];

	for (const tree of trees) {
		const atomic = await renderer.render(tree);
		const sink = recordingStream();
		const streamed = await renderer.render(tree, sink.writable as any);
		Assert.is(streamed, atomic);
		Assert.is(sink.text(), atomic);
	}
});

test("flushes the static shell before async content settles", async () => {
	async function Slow(this: Context) {
		await delay(100);
		return <span>slow</span>;
	}

	const sink = recordingStream();
	const p = renderer.render(
		<div id="shell">
			<Slow />
		</div>,
		sink.writable as any,
	);

	// The opening of the shell must arrive before the async child resolves.
	await delay(20);
	Assert.ok(
		sink.chunks.some((c) => c.value.includes('<div id="shell">')),
		"shell did not flush early",
	);
	Assert.not.ok(
		sink.text().includes("slow"),
		"async content flushed before it resolved",
	);

	const result = await p;
	Assert.is(result, '<div id="shell"><span>slow</span></div>');
	Assert.is(sink.text(), '<div id="shell"><span>slow</span></div>');
});

test("emits async siblings in document order regardless of resolution order", async () => {
	async function A() {
		await delay(80);
		return <span>A</span>;
	}

	async function B() {
		await delay(10);
		return <span>B</span>;
	}

	const sink = recordingStream();
	const result = await renderer.render(
		<div>
			<A />
			<B />
		</div>,
		sink.writable as any,
	);

	Assert.is(result, "<div><span>A</span><span>B</span></div>");
	// B resolves first, but A precedes it in the document, so A's markup must be
	// emitted first.
	const aIndex = sink.chunks.findIndex((c) => c.value.includes("A"));
	const bIndex = sink.chunks.findIndex((c) => c.value.includes("B"));
	Assert.ok(aIndex < bIndex, "siblings streamed out of document order");
});

test("a rejected async component rejects the stream", async () => {
	async function Boom() {
		await delay(1);
		throw new Error("boom");
	}

	const sink = recordingStream();
	let err: unknown;
	try {
		await renderer.render(
			<div>
				<Boom />
			</div>,
			sink.writable as any,
		);
	} catch (e) {
		err = e;
	}

	Assert.ok(err instanceof Error);
	Assert.is((err as Error).message, "boom");
});

test.run();
