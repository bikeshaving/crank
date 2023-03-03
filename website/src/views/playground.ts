import {jsx} from "@b9g/crank/standalone";
import {Root} from "../components/root.js";
import {Script} from "../components/esbuild.js";
import type {ViewProps} from "../router.js";

export default async function Playground({context: {storage}}: ViewProps) {
	return jsx`
		<${Root} title="Crank.js" url="/playground" storage=${storage}>
			<div id="playground" />
			<${Script} src="clients/playground.ts" type="module" />
		<//Root>
	`;
}
