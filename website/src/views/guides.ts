import {t} from "@b9g/crank/template.js";
import {Root} from "../components/root.js";
import {Sidebar} from "../components/navigation.js";
import type {Storage} from "../components/esbuild.js";

export interface GuidePageProps {
	title: string;
	url: string;
	docs: Array<DocInfo>;
	storage: Storage;
	children: Children;
}

export function GuidePage({
	title,
	url,
	docs,
	storage,
}: GuidePageProps): Element {
	return t`
		<${Root} title="Crank.js | ${title}" url=${url} storage=${storage}>
			<${Sidebar} docs=${docs} url=${url} title="Guides" />
			<main class="main">
				<div class="content">
					<h1>${title}</h1>
				</div>
			</main>
		<//Root>
	`;
}
