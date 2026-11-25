import {expect, test} from "bun:test";
import type {CDPSession} from "playwright";
import type {Env} from "./lab.ts";

// What the developer tools of Chrome do with the code, through the protocol
// which they use: the scripts the page has, the source map each one names,
// where an error says it was made, and where a breakpoint stops.

const FILE = "lab/app.tsx";
const BASE64 =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

interface Script {
	scriptId: string;
	url: string;
	sourceMapURL: string;
}

// A place in the code, and the place in a source which it was written at.
interface Segment {
	line: number;
	column: number;
	source: string;
	sourceLine: number;
}

function decode(
	map: any,
	lineOffset: number,
	columnOffset: number,
	segments: Array<Segment>,
): void {
	if (map.sections) {
		for (const section of map.sections) {
			decode(section.map, section.offset.line, section.offset.column, segments);
		}

		return;
	}

	let source = 0;
	let sourceLine = 0;
	const lines: Array<string> = map.mappings.split(";");
	for (let i = 0; i < lines.length; i++) {
		let column = 0;
		for (const text of lines[i].split(",")) {
			const fields: Array<number> = [];
			let value = 0;
			let shift = 0;
			for (const char of text) {
				const digit = BASE64.indexOf(char);
				value += (digit & 31) << shift;
				if (digit & 32) {
					shift += 5;
				} else {
					fields.push(value & 1 ? -(value >> 1) : value >> 1);
					value = shift = 0;
				}
			}

			if (!fields.length) {
				continue;
			}

			column += fields[0];
			if (fields.length >= 4) {
				source += fields[1];
				sourceLine += fields[2];
				segments.push({
					line: i + lineOffset,
					column: column + (i === 0 ? columnOffset : 0),
					source: map.sources[source],
					sourceLine,
				});
			}
		}
	}
}

async function getSegments(script: Script): Promise<Array<Segment>> {
	// The map is in the URL, or beside the script.
	const url = script.sourceMapURL.startsWith("data:")
		? script.sourceMapURL
		: new URL(script.sourceMapURL, script.url).href;
	const response = await fetch(url);
	const segments: Array<Segment> = [];
	decode(await response.json(), 0, 0, segments);
	return segments;
}

// Returns the place which a place in the code was written at.
function toSource(
	segments: Array<Segment>,
	line: number,
	column: number,
): Segment | undefined {
	let found: Segment | undefined;
	for (const segment of segments) {
		if (
			segment.line === line &&
			segment.column <= column &&
			(!found || segment.column >= found.column)
		) {
			found = segment;
		}
	}

	return found;
}

// Returns the first place in the code which a line of the source is at.
function toCode(segments: Array<Segment>, sourceLine: number): Segment {
	let found: Segment | undefined;
	for (const segment of segments) {
		if (
			segment.source.endsWith(FILE) &&
			segment.sourceLine === sourceLine &&
			(!found ||
				segment.line < found.line ||
				(segment.line === found.line && segment.column < found.column))
		) {
			found = segment;
		}
	}

	if (!found) {
		throw new Error(`Nothing is mapped to line ${sourceLine + 1}`);
	}

	return found;
}

export function defineDebuggerTests(
	env: Env & {read(file: string): string},
): void {
	if ((process.env.BROWSER || "chromium") !== "chromium") {
		return;
	}

	const scripts: Array<Script> = [];
	let cdp: CDPSession;
	const connect = async (): Promise<void> => {
		if (!cdp) {
			cdp = await env.lab().context().newCDPSession(env.lab());
			cdp.on("Debugger.scriptParsed", (script: any) => scripts.push(script));
			// The scripts which the page already has are listed again.
			await cdp.send("Debugger.enable");
		}
	};

	// The line of the source which has a comment, counted from zero.
	const lineOf = (comment: string): number =>
		env
			.read(FILE)
			.split("\n")
			.findIndex((line) => line.includes(comment));

	// The script which the newest render of the component ran in, and where
	// in it the error was made.
	const getFrame = async (): Promise<{
		script: Script;
		line: number;
		column: number;
	}> => {
		const stack: string = await env
			.lab()
			.evaluate(() => (window as any).probeStack);
		const match = stack
			.split("\n")
			.slice(1)
			.map((line) => line.match(/(?:\(|at )([^()\s]+):(\d+):(\d+)\)?$/))
			.find(Boolean)!;
		const script = scripts.findLast(
			(s) => s.url === match[1] && s.sourceMapURL,
		);
		if (!script) {
			throw new Error(`No script with a source map for ${match[1]}`);
		}

		return {script, line: Number(match[2]) - 1, column: Number(match[3]) - 1};
	};

	// Sets a breakpoint on a line of the source, clicks the component, and
	// returns where the page stopped and what a variable of the setup was.
	const stopAt = async (
		script: Script,
		comment: string,
	): Promise<{line: number; n: unknown}> => {
		const segments = await getSegments(script);
		const place = toCode(segments, lineOf(comment));
		const {breakpointId} = (await cdp.send("Debugger.setBreakpointByUrl", {
			url: script.url,
			lineNumber: place.line,
			columnNumber: place.column,
		})) as any;
		const paused = new Promise<any>((resolve) =>
			cdp.once("Debugger.paused", resolve),
		);
		// This does not finish until the page carries on.
		const clicked = cdp.send("Runtime.evaluate", {
			expression: "document.getElementById('probe').click()",
		});
		const {callFrames, hitBreakpoints} = await paused;
		expect(hitBreakpoints).toEqual([breakpointId]);
		const {lineNumber, columnNumber} = callFrames[0].location;
		const stopped = toSource(segments, lineNumber, columnNumber)!;
		const {result} = (await cdp.send("Debugger.evaluateOnCallFrame", {
			callFrameId: callFrames[0].callFrameId,
			expression: "n",
		})) as any;
		await cdp.send("Debugger.removeBreakpoint", {breakpointId});
		await cdp.send("Debugger.resume");
		await clicked;
		expect(stopped.source.endsWith(FILE)).toBe(true);
		return {line: stopped.sourceLine, n: result.value};
	};

	test("an error says which line of the source it was made on", async () => {
		await connect();
		const {script, line, column} = await getFrame();
		const place = toSource(await getSegments(script), line, column)!;
		expect(place.source.endsWith(FILE)).toBe(true);
		expect(place.sourceLine).toBe(lineOf("// TRACE"));
	});

	test("a breakpoint on a line of the source stops there", async () => {
		const {script} = await getFrame();
		expect(await stopAt(script, "// BREAK")).toEqual({
			line: lineOf("// BREAK"),
			n: 1,
		});
		expect(await env.lab().textContent("#probe")).toBe("probe 2");
	});

	test("an error in an edited view says which line of the source", async () => {
		env.edit(FILE, "probe {shown}", "PROBE {shown}");
		await env
			.lab()
			.waitForFunction(() =>
				document.getElementById("probe")!.textContent!.startsWith("PROBE"),
			);
		const {script, line, column} = await getFrame();
		// The view is a script of its own, with the name of its module.
		expect(script.url).toContain(FILE + "?hot=");
		const place = toSource(await getSegments(script), line, column)!;
		expect(place.source.endsWith(FILE)).toBe(true);
		expect(place.sourceLine).toBe(lineOf("// TRACE"));
	});

	test("a breakpoint in an edited view stops there", async () => {
		const {script} = await getFrame();
		expect(await stopAt(script, "// BREAK")).toEqual({
			line: lineOf("// BREAK"),
			n: 2,
		});
		expect(await env.lab().textContent("#probe")).toBe("PROBE 4");
	});
}
