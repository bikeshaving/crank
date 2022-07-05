import {t} from "@b9g/crank/template.js";
import type {Children} from "@b9g/crank/crank.js";

import type {DocInfo} from "../models/document.js";

import {Root} from "../components/root.js";
import {Sidebar} from "../components/navigation.js";
import type {Storage} from "../components/esbuild.js";

export interface GuideProps {
	title: string;
	url: string;
	docs: Array<DocInfo>;
	storage: Storage;
	children: Children;
}

export default async function Guide({
	title,
	url,
	docs,
	storage,
	children,
}: GuideProps) {
	return t`
		<${Root} title="Crank.js | ${title}" url=${url} storage=${storage}>
			<${Sidebar} docs=${docs} url=${url} title="Guides" />
			<main class="main">
				<div class="content">
					<h1>${title}</h1>
					${children}
				</div>
			</main>
		<//Root>
	`;
}
