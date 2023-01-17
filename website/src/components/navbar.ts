import {jsx} from "@b9g/crank/standalone";

export interface NavbarProps {
	url: string;
}

export function Navbar({url}: NavbarProps) {
	return jsx`
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
						href="/guides/getting-started"
						class=${url.startsWith("/guides") && "current"}
					>Guides</a>
				</div>
				<div class="navbar-item">
					<a
						href="/blog/"
						class=${url.startsWith("/blog") && "current"}
					>Blog</a>
				</div>
				<div class="navbar-item">
					<a
						href="/playground/"
						class=${url.startsWith("/playground") && "current"}
					>Playground</a>
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
