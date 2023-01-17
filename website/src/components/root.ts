import {jsx, Raw} from "@b9g/crank/standalone";
import type {Children} from "@b9g/crank";
import {Page, Link, Script, Storage} from "../components/esbuild.js";
import {Navbar} from "../components/navbar.js";
import {GoogleSpyware} from "../components/google-spyware.js";

export interface RootProps {
	title: string;
	children: Children;
	url: string;
	storage: Storage;
}

export function Root({title, children, url, storage}: RootProps) {
	return jsx`
		<${Raw} value="<!DOCTYPE html>" />
		<${Page} storage=${storage}>
			<html lang="en">
				<head>
					<meta charset="UTF-8" />
					<meta name="viewport" content="width=device-width" />
					<title>${title}</title>
					<${Link} rel="stylesheet" type="text/css" href="client.css" />
					<link rel="shortcut icon" href="/static/favicon.ico" />
					<!--
					<${GoogleSpyware} />
					-->
				</head>
				<body>
					<${Navbar} url=${url} />
					<>${children}</>
					<${Script} src="client.ts" />
				</body>
			</html>
		<//Page>
	`;
}
