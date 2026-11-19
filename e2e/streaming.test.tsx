import {afterAll, beforeAll, expect, test} from "bun:test";
import {createServer} from "node:http";
import type {AddressInfo} from "node:net";
import * as playwright from "playwright";
import type {Browser} from "playwright";

import {createElement, Raw} from "../src/crank.js";
import type {Children} from "../src/crank.js";
import {Suspense} from "../src/async.js";
import {renderer} from "../src/html.js";

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
let browser: Browser;
beforeAll(async () => {
	server = Bun.serve({
		port: 0,
		fetch(req) {
			const {readable, writable} = new TextEncoderStream();
			const isSuspense = new URL(req.url).pathname === "/suspense";
			renderer
				.render(isSuspense ? <SuspensePage /> : <Page />, writable)
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
