import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";
import {Root} from "../components/root.js";

interface ViewProps {
	url: string;
	params: Record<string, string>;
}

const sectionStyle = css`
	max-width: 800px;
	margin: 0 auto;
	padding: 2rem 1rem;

	@media (min-width: 800px) {
		padding: 2rem 2rem;
	}
`;

const headingStyle = css`
	color: var(--highlight-color);
	font-size: 1.5rem;
	margin: 2rem 0 1rem;
	border-bottom: 1px solid var(--text-color);
	padding-bottom: 0.5rem;
`;

function CopySection() {
	return jsx`
		<section class=${sectionStyle}>
			<h1 class=${css`
				color: var(--highlight-color);
				font-size: 2rem;
				margin: 0 0 1.5rem;
				padding-top: 60px;
			`}>Press Kit</h1>
			<h2 class=${headingStyle}>About</h2>
			<dl class=${css`
				line-height: 1.6;

				dt {
					font-weight: bold;
					margin-top: 0.75em;
				}

				dd {
					margin: 0.25em 0 0 0;
				}
			`}>
				<dt>Name</dt>
				<dd>Crank.js</dd>
				<dt>Tagline</dt>
				<dd>${"\u201CThe Just JavaScript UI Framework\u201D"}</dd>
				<dt>Description</dt>
				<dd>Crank is a JavaScript/TypeScript library for building websites and applications. It is a UI framework where components are defined with plain old functions, including async and generator functions.</dd>
				<dt>Website</dt>
				<dd><a href="https://crank.js.org">crank.js.org</a></dd>
				<dt>Author</dt>
				<dd><a href="https://github.com/brainkim">Brian Kim</a></dd>
				<dt>Created</dt>
				<dd>2019</dd>
				<dt>License</dt>
				<dd>MIT</dd>
			</dl>
		</section>
	`;
}

function LogoCard({
	src,
	label,
	background,
}: {
	src: string;
	label: string;
	background: string;
}) {
	return jsx`
		<div class=${css`
			border: 1px solid var(--text-color);
			border-radius: 4px;
			overflow: hidden;
		`}>
			<div
				role="img"
				aria-label=${label}
				class=${css`
					height: 200px;
					background:
						url(${src}) center / contain no-repeat,
						${background};
				`}
			/>
			<div class=${css`
				padding: 0.75rem 1rem;
				display: flex;
				justify-content: space-between;
				align-items: center;
				border-top: 1px solid var(--text-color);
			`}>
				<span>${label}</span>
				<a href=${src} download>Download SVG</a>
			</div>
		</div>
	`;
}

function LogoSection() {
	return jsx`
		<section class=${sectionStyle}>
			<h2 class=${headingStyle}>Logo</h2>
			<div class=${css`
				display: grid;
				gap: 1.5rem;

				@media (min-width: 600px) {
					grid-template-columns: repeat(2, 1fr);
				}
			`}>
				<${LogoCard}
					src="/static/logo-dark.svg"
					label="Dark background"
					background="#0a0e1f"
				/>
				<${LogoCard}
					src="/static/logo-light.svg"
					label="Light background"
					background="#e7f4f5"
				/>
				<${LogoCard}
					src="/static/logo-transparent.svg"
					label="Transparent background"
					background="repeating-conic-gradient(rgba(255,255,255,0.08) 0% 25%, rgba(0,0,0,0.08) 25% 50%) 50% / 16px 16px"
				/>
			</div>
		</section>
	`;
}

function Swatch({color, label}: {color: string; label: string}) {
	return jsx`
		<div class=${css`
			display: flex;
			align-items: center;
			gap: 0.75rem;
		`}>
			<div class=${css`
				width: 48px;
				height: 48px;
				border-radius: 4px;
				border: 1px solid var(--text-color);
				background: ${color};
				flex: none;
			`} />
			<div>
				<div class=${css`
					font-weight: bold;
				`}>${label}</div>
				<code>${color}</code>
			</div>
		</div>
	`;
}

function ColorsSection() {
	return jsx`
		<section class=${sectionStyle}>
			<h2 class=${headingStyle}>Brand Colors</h2>
			<div class=${css`
				display: flex;
				flex-wrap: wrap;
				gap: 1.5rem;
			`}>
				<${Swatch} color="#0a0e1f" label="Dark" />
				<${Swatch} color="#e7f4f5" label="Light" />
				<${Swatch} color="#daa520" label="Goldenrod" />
			</div>
		</section>
	`;
}

function TrademarkSection() {
	return jsx`
		<section class=${css`
			${sectionStyle};
			padding-bottom: 4rem;
			font-size: 0.9rem;
			opacity: 0.7;
		`}>
			<h2 class=${headingStyle}>Trademark Notice</h2>
			<p>Crank.js${"™"} is a trademark of <a href="https://bikeshaving.org">Bike Shaving</a>.</p>
			<p>JavaScript${"®"} is a trademark of Oracle Corporation, <a href="https://javascript.tm/">pending legislation</a>.</p>
		</section>
	`;
}

export default function PressKit({url}: ViewProps) {
	return jsx`
		<${Root} title=${"Press Kit \u2014 Crank.js"} url=${url}>
			<${CopySection} />
			<${LogoSection} />
			<${ColorsSection} />
			<${TrademarkSection} />
		<//Root>
	`;
}
