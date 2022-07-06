import {t} from "@b9g/crank/template.js";

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
