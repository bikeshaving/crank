import {createElement} from "../src/crank.js";
import {renderer} from "../src/dom.js";
import {App} from "./app.js";

// The browser has the data by the time it hydrates, but not synchronously.
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 20));
const warnings: Array<string> = ((window as any).warnings = []);
const warn = console.warn;
console.warn = (...args: Array<unknown>) => {
	warnings.push(args.map(String).join(" "));
	warn(...args);
};

Promise.resolve(
	renderer.hydrate(<App wait={wait} />, document.getElementById("root")!),
).then(() => ((window as any).hydrated = true));
