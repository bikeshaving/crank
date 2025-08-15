import * as FS from "fs/promises";
import * as Path from "path";
import {jsx} from "@b9g/crank/standalone";
import {Root} from "../components/root.js";
import {Script} from "../components/esbuild.js";
import {SerializeScript} from "../components/serialize-javascript.js";
import type {ViewProps} from "../router.js";

const __dirname = new URL(".", import.meta.url).pathname;
const EXAMPLES_DIR = Path.join(__dirname, "../../../examples");

const TIMER_EXAMPLE = `
import {renderer} from "@b9g/crank/dom";

function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);

  for ({} of this) {
    yield <div>{seconds}</div>;
  }

  clearInterval(interval);
}

renderer.render(<Timer />, document.body);
`.trim();

// Read all examples dynamically
async function loadExamples() {
	const files = await FS.readdir(EXAMPLES_DIR);
	const exampleFiles = files.filter(
		(file) =>
			file.endsWith(".js") || file.endsWith(".ts") || file.endsWith(".tsx"),
	);

	const examples = [{name: "timer", label: "Timer", code: TIMER_EXAMPLE}];

	// Define display names for examples
	const exampleLabels = {
		"greeting.js": "Hello World",
		"todomvc.js": "Todo MVC",
		"hackernews.js": "Hacker News",
		"animated-letters.js": "Animated Letters",
		"wizard.js": "Form Wizard",
		"tetris.ts": "Tetris",
		"xstate-calculator.tsx": "XState Calculator",
		"hexagonal-minesweeper.ts": "Hexagonal Minesweeper",
	};

	for (const file of exampleFiles) {
		const name = Path.basename(file, Path.extname(file));
		const label =
			exampleLabels[file] ||
			name.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
		const code = await FS.readFile(Path.join(EXAMPLES_DIR, file), "utf8");

		examples.push({name, label, code});
	}

	return examples;
}


export default async function Playground({context: {storage}}: ViewProps) {
	const examples = await loadExamples();
	return jsx`
		<${Root} title="Crank.js" url="/playground" storage=${storage}>
			<div id="playground" />
			<${SerializeScript} id="examples" value=${examples} />
			<${Script} src="clients/playground.ts" type="module" />
		<//Root>
	`;
}
