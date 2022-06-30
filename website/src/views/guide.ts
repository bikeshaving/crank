import {t} from "@b9g/crank/template.js";
import {Root} from "../components/root.js";
import {Sidebar} from "../components/navigation.js";

export interface GuideProps {
	title: string;
	url: string;
	docs: Array<DocInfo>;
	children: Children;
}

export default function Guide({title, docs, url, children}: GuideProps) {
	return t`
		<${Root} title="Crank.js | ${title}" url=${url}>
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
