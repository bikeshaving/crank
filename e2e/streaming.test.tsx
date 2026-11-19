import {afterAll, beforeAll, expect, test} from "bun:test";
import {createServer} from "node:http";
import type {AddressInfo} from "node:net";
import * as playwright from "playwright";
import type {Browser} from "playwright";

import {createElement, Raw} from "../src/crank.js";
import type {Children} from "../src/crank.js";
import {Suspense, SuspenseList} from "../src/async.js";
import {renderer} from "../src/html.js";
import {App} from "./app.js";

// WebKit on Linux does not start parsing a response until it has received
// some amount of it, so the page starts with a comment larger than that.
const PADDING = "<!--" + " ".repeat(2048) + "-->";

// The page's slow component waits for the test to call release().
let release: () => void;
async function Slow({children}: {children: Children}): Promise<Children> {
	await new Promise<void>((resolve) => (release = resolve));
	return children;
}

function Page(): Children {
	return (
		<html>
			<head>
				<Raw value={PADDING} />
				<title>Streaming</title>
			</head>
			<body>
				<h1>Shell</h1>
				<Slow>
					<p id="slow">Slow</p>
				</Slow>
				<footer>Footer</footer>
			</body>
		</html>
	);
}

// A page whose slow component is in a Suspense component, so that the footer
// does not wait for it.
function SuspensePage(): Children {
	return (
		<html>
			<head>
				<Raw value={PADDING} />
				<title>Streaming</title>
			</head>
			<body>
				<h1>Shell</h1>
				<Suspense fallback={<p id="fallback">Loading</p>} timeout={0}>
					<Slow>
						<p id="slow">Slow</p>
					</Slow>
				</Suspense>
				<footer>Footer</footer>
			</body>
		</html>
	);
}

// A page whose app is hydrated by a script when the document has loaded.
function HydratedPage({fail}: {fail?: boolean}): Children {
	// The slow part of the app waits for the test, and then renders or fails.
	const wait = () =>
		new Promise<void>((resolve, reject) => {
			release = fail ? () => reject(new Error("failed")) : resolve;
		});

	return (
		<html>
			<head>
				<Raw value={PADDING} />
				<title>Streaming</title>
				<script type="module" src="/client.js" />
			</head>
			<body>
				<div id="root">
					<App wait={wait} />
				</div>
			</body>
		</html>
	);
}

// Components which each wait for the test to call their own function.
const releases: Record<string, () => void> = {};
async function Named({name}: {name: string}): Promise<Children> {
	await new Promise<void>((resolve) => (releases[name] = resolve));
	return <b>{name}</b>;
}

// A page with a list of Suspense components, which are revealed in order.
function ListPage(): Children {
	return (
		<html>
			<head>
				<Raw value={PADDING} />
				<title>Streaming</title>
			</head>
			<body>
				<SuspenseList>
					<Suspense fallback="(a)" timeout={0}>
						<Named name="A" />
					</Suspense>
					<Suspense fallback="(b)" timeout={0}>
						<Named name="B" />
					</Suspense>
					<Suspense fallback="(c)" timeout={0}>
						<Named name="C" />
					</Suspense>
				</SuspenseList>
				<footer>Footer</footer>
			</body>
		</html>
	);
}

// A page whose slow component renders scripts: one which runs, and one which
// carries data.
function ScriptPage(): Children {
	return (
		<html>
			<head>
				<Raw value={PADDING} />
				<title>Streaming</title>
			</head>
			<body>
				<Suspense fallback="Loading" timeout={0}>
					<Slow>
						<script>{"window.ran = (window.ran || 0) + 1;"}</script>
						<script type="application/json" id="data">
							{'{"posts": 3}'}
						</script>
					</Slow>
				</Suspense>
				<footer>Footer</footer>
			</body>
		</html>
	);
}

const SHELL = `<html><head>${PADDING}<title>Streaming</title></head><body><h1>Shell</h1>`;
const REST = '<p id="slow">Slow</p><footer>Footer</footer></body></html>';

// Reads a response, releasing the slow component once the shell has arrived.
async function readChunks(response: Response): Promise<Array<string>> {
	const reader = response
		.body!.pipeThrough(new TextDecoderStream())
		.getReader();
	const chunks = [(await reader.read()).value!];
	release();
	for (;;) {
		const {value, done} = await reader.read();
		if (done) {
			return chunks;
		}

		chunks.push(value);
	}
}

let server: ReturnType<typeof Bun.serve>;
let client: string;
let browser: Browser;
beforeAll(async () => {
	const build = await Bun.build({
		entrypoints: [import.meta.dir + "/client.tsx"],
		target: "browser",
	});
	client = await build.outputs[0].text();
	server = Bun.serve({
		port: 0,
		fetch(req) {
			const {pathname} = new URL(req.url);
			if (pathname === "/client.js") {
				return new Response(client, {
					headers: {"Content-Type": "text/javascript"},
				});
			}

			const {readable, writable} = new TextEncoderStream();
			renderer
				.render(
					pathname === "/suspense" ? (
						<SuspensePage />
					) : pathname === "/hydrate" ? (
						<HydratedPage />
					) : pathname === "/script" ? (
						<ScriptPage />
					) : pathname === "/list" ? (
						<ListPage />
					) : pathname === "/failed" ? (
						<HydratedPage fail={true} />
					) : (
						<Page />
					),
					writable,
				)
				.catch(() => {});
			return new Response(readable, {
				headers: {"Content-Type": "text/html; charset=utf-8"},
			});
		},
	});

	const name = (process.env.BROWSER || "chromium") as
		| "chromium"
		| "firefox"
		| "webkit";
	browser = await playwright[name].launch();
});

afterAll(async () => {
	await browser.close();
	await server.stop(true);
});

test("the server sends the shell before the slow component settles", async () => {
	expect(await readChunks(await fetch(server.url))).toEqual([SHELL, REST]);
});

test("a Node.js server sends the shell before the slow component settles", async () => {
	const nodeServer = createServer((_req, res) => {
		res.setHeader("Content-Type", "text/html; charset=utf-8");
		renderer.render(<Page />, res).catch(() => {});
	});
	await new Promise<void>((resolve) => nodeServer.listen(0, resolve));
	try {
		const {port} = nodeServer.address() as AddressInfo;
		const response = await fetch(`http://localhost:${port}/`);
		expect(await readChunks(response)).toEqual([SHELL, REST]);
	} finally {
		nodeServer.close();
	}
});

test("the browser shows the shell before the slow component settles", async () => {
	const page = await browser.newPage();
	try {
		await page.goto(server.url.href, {waitUntil: "commit"});
		await page.waitForSelector("h1");
		expect(await page.title()).toBe("Streaming");
		expect(await page.evaluate(() => document.readyState)).toBe("loading");
		expect(await page.evaluate(() => document.body.innerHTML)).toBe(
			"<h1>Shell</h1>",
		);

		release();
		await page.waitForLoadState("load");
		expect(await page.evaluate(() => document.body.innerHTML)).toBe(
			'<h1>Shell</h1><p id="slow">Slow</p><footer>Footer</footer>',
		);
	} finally {
		await page.close();
	}
});

test("the browser replaces the fallback of a Suspense component", async () => {
	const page = await browser.newPage();
	try {
		await page.goto(server.url.href + "suspense", {waitUntil: "commit"});
		// The footer comes after the slow component in the document.
		await page.waitForSelector("footer");
		expect(await page.evaluate(() => document.readyState)).toBe("loading");
		expect(await page.evaluate(() => document.body.textContent)).toBe(
			"ShellLoadingFooter",
		);

		release();
		await page.waitForLoadState("load");
		expect(await page.evaluate(() => document.body.innerHTML)).toBe(
			'<h1>Shell</h1><p id="slow">Slow</p><footer>Footer</footer>',
		);
	} finally {
		await page.close();
	}
});

test("the browser hydrates a Suspense component whose children were streamed", async () => {
	const page = await browser.newPage();
	try {
		await page.goto(server.url.href + "hydrate", {waitUntil: "commit"});
		await page.waitForSelector("footer");
		expect(await page.evaluate(() => document.readyState)).toBe("loading");
		expect(await page.evaluate(() => document.body.textContent)).toBe(
			"ShellLoadingFooter",
		);

		release();
		await page.waitForSelector("#slow");
		// The script marks the node, so that hydration replacing it would show.
		await page.evaluate(
			() => ((document.getElementById("slow") as any).fromServer = true),
		);
		await page.waitForFunction(() => (window as any).hydrated);
		expect(await page.evaluate(() => (window as any).warnings)).toEqual([]);
		expect(
			await page.evaluate(() => document.getElementById("root")!.innerHTML),
		).toBe(
			'<main><h1>Shell</h1><p id="slow">Slow</p><button id="count">0</button><footer>Footer</footer></main>',
		);
		expect(
			await page.evaluate(
				() => (document.getElementById("slow") as any).fromServer,
			),
		).toBe(true);

		await page.click("#count");
		expect(await page.textContent("#count")).toBe("1");
	} finally {
		await page.close();
	}
});

test("the browser renders a Suspense component whose children failed on the server", async () => {
	const page = await browser.newPage();
	try {
		await page.goto(server.url.href + "failed", {waitUntil: "commit"});
		await page.waitForSelector("footer");
		await page.evaluate(
			() => ((document.querySelector("footer") as any).fromServer = true),
		);

		// The server finishes the document with the fallback in place.
		release();
		await page.waitForFunction(() => (window as any).hydrated);
		expect(await page.evaluate(() => (window as any).warnings)).toEqual([]);
		expect(
			await page.evaluate(() => document.getElementById("root")!.innerHTML),
		).toBe(
			'<main><h1>Shell</h1><p id="slow">Slow</p><button id="count">0</button><footer>Footer</footer></main>',
		);
		expect(
			await page.evaluate(
				() => (document.querySelector("footer") as any).fromServer,
			),
		).toBe(true);

		await page.click("#count");
		expect(await page.textContent("#count")).toBe("1");
	} finally {
		await page.close();
	}
});

test("the browser reveals the Suspense components of a list in order", async () => {
	const page = await browser.newPage();
	const text = () => page.evaluate(() => document.body.textContent);
	try {
		await page.goto(server.url.href + "list", {waitUntil: "commit"});
		// Only the fallback of the first component is shown.
		await page.waitForSelector("footer");
		expect(await text()).toBe("(a)Footer");

		// The second component waits for the first.
		releases.B();
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(await text()).toBe("(a)Footer");

		// Both are revealed, and the fallback of the third is shown.
		releases.A();
		// This polls on a timer, because waiting on animation frames timed out
		// in WebKit while the page was still loading.
		await page.waitForFunction(
			() => document.body.textContent === "AB(c)Footer",
			undefined,
			{polling: 50},
		);
		expect(await page.evaluate(() => document.readyState)).toBe("loading");

		releases.C();
		await page.waitForLoadState("load");
		expect(await page.evaluate(() => document.body.innerHTML)).toBe(
			"<b>A</b><b>B</b><b>C</b><footer>Footer</footer>",
		);
	} finally {
		await page.close();
	}
});

test("scripts in the children of a Suspense component run once", async () => {
	const page = await browser.newPage();
	try {
		await page.goto(server.url.href + "script", {waitUntil: "commit"});
		await page.waitForSelector("footer");
		expect(await page.evaluate(() => (window as any).ran)).toBe(undefined);

		release();
		await page.waitForLoadState("load");
		expect(await page.evaluate(() => (window as any).ran)).toBe(1);
		expect(
			await page.evaluate(() =>
				JSON.parse(document.getElementById("data")!.textContent!),
			),
		).toEqual({posts: 3});
	} finally {
		await page.close();
	}
});
