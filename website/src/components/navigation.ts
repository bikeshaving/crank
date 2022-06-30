import {t} from "@b9g/crank/template.js";
import type {Element} from "@b9g/crank";

export interface NavbarProps {
	url: string;
}

export function Navbar({url}: NavbarProps) {
	return t`
		<nav id="navbar" class="navbar">
			<div class="navbar-group">
				<div class="navbar-item">
					<a
						class="navbar-title-link ${url === "/" ? "current" : ""}"
						href="/"
					>
						<img class="navbar-logo" src="/static/logo.svg" alt="" />
						<span>Crank.js</span>
					</a>
				</div>
				<div class="navbar-item">
					<a
						class=${url.startsWith("/guides") && "current"}
						href="/guides/getting-started"
					>
						Docs
					</a>
				</div>
				<div class="navbar-item">
					<a class=${url.startsWith("/blog") && "current"} href="/blog/">
						Blog
					</a>
				</div>
			</div>
			<div class="navbar-group">
				<div class="navbar-item">
					<a href="https://github.com/bikeshaving/crank">GitHub</a>
				</div>
				<div class="navbar-item">
					<a href="http://npm.im/@b9g/crank">NPM</a>
				</div>
			</div>
		</nav>
	`;
}

// TODO: Import this or something
interface DocInfo {
	attributes: {
		title: string;
		publish: boolean;
		publishDate?: Date;
	};
	url: string;
	filename: string;
	body: string;
}

export interface SidebarProps {
	docs: Array<DocInfo>;
	url: string;
	title: string;
}

export function Sidebar({docs, title, url}: SidebarProps) {
	const links: Array<Element> = [];
	for (const doc of docs) {
		if (doc.attributes.publish) {
			links.push(t`
				<div class="sidebar-item">
					<a href=${doc.url} class=${doc.url === url ? "current" : ""}>
						${doc.attributes.title}
					</a>
				</div>
			`);
		}
	}

	return t`
		<div id="sidebar" class="sidebar">
			<h3>${title}</h3>
			${links}
		</div>
	`;
}
