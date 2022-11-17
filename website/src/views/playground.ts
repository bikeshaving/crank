import {jsx} from "@b9g/crank";
import {Root} from "../components/root.js";
import {Script} from "../components/esbuild.js";
import type {Storage} from "../components/esbuild.js";

export default async function Playground({storage}: {storage: Storage}) {
	return jsx`
		<${Root} title="Crank.js" url="/playground" storage=${storage}>
			<div id="playground" />
			<${Script} src="./playground.ts" type="module" />
		<//Root>
	`;
}
