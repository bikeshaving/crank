import {xm} from "@b9g/crank";
import {Root} from "../components/root.js";
import {Script} from "../components/esbuild.js";
import type {Storage} from "../components/esbuild.js";

const __dirname = new URL(".", import.meta.url).pathname;

export default async function Playground({storage}: {storage: Storage}) {
	return xm`
		<${Root} title="Crank.js" url="/" storage=${storage}>
			<div id="playground" />
			<${Script} src="./playground.ts" type="module" />
		<//Root>
	`;
}
