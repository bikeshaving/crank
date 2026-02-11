import {jsx} from "@b9g/crank/standalone";
import {Root} from "../components/root.js";
import {SerializeScript} from "../components/serialize-javascript.js";
import {assets} from "../server.js";

interface ViewProps {
	url: string;
	params: Record<string, string>;
}

const TIMER_EXAMPLE = `
import {renderer} from "@b9g/crank/dom";

function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => this.refresh(() => seconds++), 1000);
  for ({} of this) {
    yield <div>{seconds}</div>;
  }

  clearInterval(interval);
}

renderer.render(<Timer />, document.body);
`.trim();

// Read all examples dynamically
async function loadExamples() {
	const examplesDir = await self.directories.open("examples");

	const examples = [{name: "timer", label: "Timer", code: TIMER_EXAMPLE}];

	// Define display names for examples
	const exampleLabels: Record<string, string> = {
		"greeting.js": "Hello World",
		"todomvc.js": "Todo MVC",
		"hackernews.js": "Hacker News",
		"animated-letters.js": "Animated Letters",
		"mathml.js": "MathML",
		"wizard.js": "Form Wizard",
		"tetris.ts": "Tetris",
		"xstate-calculator.tsx": "XState Calculator",
		"hexagonal-minesweeper.ts": "Hexagonal Minesweeper",
	};

	const entries: Array<[string, FileSystemHandle]> = [];
	for await (const entry of examplesDir.entries()) {
		entries.push(entry);
	}
	entries.sort((a, b) => a[0].localeCompare(b[0]));

	const exampleFiles = entries.filter(
		([name, handle]) =>
			handle.kind === "file" &&
			(name.endsWith(".js") || name.endsWith(".ts") || name.endsWith(".tsx")),
	);

	for (const [file, handle] of exampleFiles) {
		const dotIndex = file.lastIndexOf(".");
		const name = dotIndex !== -1 ? file.slice(0, dotIndex) : file;
		const label =
			exampleLabels[file] ||
			name.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
		const fileObj = await (handle as FileSystemFileHandle).getFile();
		const code = await fileObj.text();

		examples.push({name, label, code});
	}

	return examples;
}

export default async function Playground({url}: ViewProps) {
	const examples = await loadExamples();
	return jsx`
		<${Root} title="Crank.js" url=${url} noFooter>
			<div id="playground" />
			<${SerializeScript} id="examples" value=${examples} />
			<script type="module" src=${assets.playgroundScript}></script>
		<//Root>
	`;
}
