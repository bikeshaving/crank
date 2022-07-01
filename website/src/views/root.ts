import {t} from "@b9g/crank/template.js";
import type {Children} from "@b9g/crank/crank.js";
import {Page, Link, Script, Storage} from "../components/esbuild.js";
import {Navbar} from "../components/navigation.js";

const rootDirname = new URL("..", import.meta.url).pathname;
const storage = new Storage({dirname: rootDirname});

export interface RootProps {
	title: string;
	children: Children;
	url: string;
}

export function Root({title, children, url}: RootProps) {
	return t`
		<$RAW value="<!DOCTYPE html>" />
		<${Page} storage=${storage}>
			<html lang="en">
				<head>
					<meta charset="UTF-8" />
					<meta name="viewport" content="width=device-width" />
					<title>${title}</title>
					<${Link} rel="stylesheet" type="text/css" href="client.css" />
					<link rel="shortcut icon" href="/static/favicon.ico" />
					<script
						async
						src="https://www.googletagmanager.com/gtag/js?id=UA-20910936-4"
					/>
					<script
						innerHTML=${`
							window.dataLayer = window.dataLayer || [];
							function gtag(){dataLayer.push(arguments);}
							gtag('js', new Date());

							gtag('config', 'UA-20910936-4');
						`}
					/>
				</head>
				<body>
					<${Navbar} url=${url} />
					<div class="non-footer">${children}</div>
					<${Script} src="client.ts" />
				</body>
			</html>
		<//Page>
	`!;
}
