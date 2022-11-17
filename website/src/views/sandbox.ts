import {jsx, Raw} from "@b9g/crank";
import {Link, Page, Script} from "../components/esbuild.js";
import type {Storage} from "../components/esbuild.js";

export default async function Sandbox({storage}: {storage: Storage}) {
	return jsx`
		<${Raw} value="<!DOCTYPE html>" />
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
