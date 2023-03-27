import * as FS from "fs/promises";
import * as Path from "path";
import {jsx} from "@b9g/crank/standalone";
import {Root} from "../components/root.js";
import {Script} from "../components/esbuild.js";
import {SerializeScript} from "../components/serialize-javascript.js";
import type {ViewProps} from "../router.js";

const __dirname = new URL(".", import.meta.url).pathname;
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
// TODO: read examples dir

const TETRIS_EXAMPLE = await FS.readFile(
	Path.join(__dirname, "../../examples/tetris.ts"),
	"utf8",
);

const WIZARD_EXAMPLE = await FS.readFile(
	Path.join(__dirname, "../../examples/wizard.js"),
	"utf8",
);

const XSTATE_EXAMPLE = await FS.readFile(
	Path.join(__dirname, "../../examples/xstate-calculator.tsx"),
	"utf8",
);

const examples = [
	{name: "timer", label: "Timer", code: TIMER_EXAMPLE},
	{name: "wizard", label: "Form Wizard", code: WIZARD_EXAMPLE},
	{name: "tetris", label: "Tetris", code: TETRIS_EXAMPLE},
	{name: "calculator", label: "XState Calculator", code: XSTATE_EXAMPLE},
];

export default async function Playground({context: {storage}}: ViewProps) {
	return jsx`
		<${Root} title="Crank.js" url="/playground" storage=${storage}>
			<div id="playground" />
			<${SerializeScript} id="examples" value=${examples} />
			<${Script} src="clients/playground.ts" type="module" />
		<//Root>
	`;
}
