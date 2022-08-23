import {xm} from "@b9g/crank";
import {Link, Page, Script} from "../components/esbuild.js";
import type {Storage} from "../components/esbuild.js";

const __dirname = new URL(".", import.meta.url).pathname;

export default async function Sandbox({storage}: {storage: Storage}) {
	return xm`
		<$RAW value="<!DOCTYPE html>" />
		<html lang="en">
			<${Page} storage=${storage}>
				<head>
					<meta charset="UTF-8" />
					<meta name="viewport" content="width=device-width" />
					<title>Sandbox</title>
					<${Link} rel="stylesheet" type="text/css" href="client.css" />
					<link rel="shortcut icon" href="/static/favicon.ico" />
				</head>
				<body>
					<div id="sandbox"></div>
					<${Script} src="./sandbox.ts" type="module" />
				</body>
			<//Page>
		</html>
	`;
}
