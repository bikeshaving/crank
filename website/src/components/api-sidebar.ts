import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";
import type {Element} from "@b9g/crank/standalone";
import {Search} from "./search.js";

export interface APIModule {
	name: string;
	slug: string;
	categories: Array<{
		name: string;
		slug: string;
		items: Array<{
			name: string;
			slug: string;
			url: string;
		}>;
	}>;
}

const sidebarStyle = css`
	background-color: var(--bg-color);
	margin-top: 50px;
	padding: 2rem 0.4rem;
	color: var(--text-color);
	border-right: 1px solid currentcolor;
	border-bottom: 1px solid currentcolor;
	@media screen and (min-width: 800px) {
		position: fixed;
		top: 50px;
		bottom: 0;
		overflow-x: hidden;
		overflow-y: auto;
		width: 15rem;
		margin: 0;
		padding: 2rem 1rem;
		text-align: right;
	}

	@media screen and (min-width: 1100px) {
		padding: 3rem 2rem;
		width: 20rem;
	}

	> :first-child {
		margin-top: 0;
	}
`;

const moduleHeaderStyle = css`
	color: var(--highlight-color);
	font-size: 1rem;
	margin: 1.5rem 0 0.5rem;
	font-weight: bold;

	&:first-of-type {
		margin-top: 0;
	}
`;

const categoryStyle = css`
	font-size: 0.85rem;
	color: var(--text-color);
	opacity: 0.7;
	margin: 0.75rem 0 0.25rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
`;

const linkStyle = css`
	display: block;
	margin: 0.4rem 0;
	text-decoration: none;
	font-size: 0.9rem;

	&[aria-current="page"] {
		font-weight: bold;
		color: var(--highlight-color);
	}
`;

export function APISidebar({
	modules,
	url,
}: {
	modules: Array<APIModule>;
	url: string;
}) {
	const links: Array<Element> = [];

	for (const mod of modules) {
		links.push(jsx`
			<div class=${moduleHeaderStyle}>
				<a
					href="/api/${mod.slug}"
					class=${css`
						text-decoration: none;
					`}
					aria-current=${url === `/api/${mod.slug}` && "page"}
				>${mod.name}</a>
			</div>
		`);

		for (const category of mod.categories) {
			links.push(jsx`<div class=${categoryStyle}>${category.name}</div>`);
			for (const item of category.items) {
				links.push(jsx`
					<a
						href=${item.url}
						class=${linkStyle}
						aria-current=${url === item.url && "page"}
					>${item.name}</a>
				`);
			}
		}
	}

	return jsx`
		<div id="sidebar" class=${sidebarStyle}>
			<h2 class=${css`
				color: var(--highlight-color);
				margin-top: 0;
			`}>
				<a
					href="/api"
					class=${css`
						text-decoration: none;
					`}
					aria-current=${url === "/api" && "page"}
				>API Reference</a>
			</h2>
			<div id="search-root">
				<${Search} />
			</div>
			${links}
		</div>
	`;
}

export const API_MODULES: Array<APIModule> = [
	{
		name: "@b9g/crank",
		slug: "core",
		categories: [
			{
				name: "Functions",
				slug: "functions",
				items: [
					{
						name: "createElement",
						slug: "createElement",
						url: "/api/core/functions/createElement",
					},
					{
						name: "cloneElement",
						slug: "cloneElement",
						url: "/api/core/functions/cloneElement",
					},
					{
						name: "isElement",
						slug: "isElement",
						url: "/api/core/functions/isElement",
					},
				],
			},
			{
				name: "Classes",
				slug: "classes",
				items: [
					{name: "Element", slug: "Element", url: "/api/core/classes/Element"},
					{name: "Context", slug: "Context", url: "/api/core/classes/Context"},
					{
						name: "Renderer",
						slug: "Renderer",
						url: "/api/core/classes/Renderer",
					},
				],
			},
			{
				name: "Interfaces",
				slug: "interfaces",
				items: [
					{
						name: "RenderAdapter",
						slug: "RenderAdapter",
						url: "/api/core/interfaces/RenderAdapter",
					},
				],
			},
			{
				name: "Types",
				slug: "types",
				items: [
					{name: "Tag", slug: "Tag", url: "/api/core/types/Tag"},
					{name: "Child", slug: "Child", url: "/api/core/types/Child"},
					{name: "Children", slug: "Children", url: "/api/core/types/Children"},
					{
						name: "Component",
						slug: "Component",
						url: "/api/core/types/Component",
					},
					{
						name: "ElementValue",
						slug: "ElementValue",
						url: "/api/core/types/ElementValue",
					},
				],
			},
			{
				name: "Components",
				slug: "components",
				items: [
					{
						name: "Fragment",
						slug: "Fragment",
						url: "/api/core/components/Fragment",
					},
					{
						name: "Portal",
						slug: "Portal",
						url: "/api/core/components/Portal",
					},
					{name: "Copy", slug: "Copy", url: "/api/core/components/Copy"},
					{name: "Text", slug: "Text", url: "/api/core/components/Text"},
					{name: "Raw", slug: "Raw", url: "/api/core/components/Raw"},
				],
			},
		],
	},
	{
		name: "@b9g/crank/async",
		slug: "async",
		categories: [
			{
				name: "Functions",
				slug: "functions",
				items: [{name: "lazy", slug: "lazy", url: "/api/async/functions/lazy"}],
			},
			{
				name: "Components",
				slug: "components",
				items: [
					{
						name: "Suspense",
						slug: "Suspense",
						url: "/api/async/components/Suspense",
					},
					{
						name: "SuspenseList",
						slug: "SuspenseList",
						url: "/api/async/components/SuspenseList",
					},
				],
			},
		],
	},
	{
		name: "@b9g/crank/dom",
		slug: "dom",
		categories: [
			{
				name: "Classes",
				slug: "classes",
				items: [
					{
						name: "DOMRenderer",
						slug: "DOMRenderer",
						url: "/api/dom/classes/DOMRenderer",
					},
				],
			},
			{
				name: "Objects",
				slug: "objects",
				items: [
					{name: "adapter", slug: "adapter", url: "/api/dom/objects/adapter"},
					{
						name: "renderer",
						slug: "renderer",
						url: "/api/dom/objects/renderer",
					},
				],
			},
		],
	},
	{
		name: "@b9g/crank/html",
		slug: "html",
		categories: [
			{
				name: "Classes",
				slug: "classes",
				items: [
					{
						name: "HTMLRenderer",
						slug: "HTMLRenderer",
						url: "/api/html/classes/HTMLRenderer",
					},
				],
			},
			{
				name: "Objects",
				slug: "objects",
				items: [
					{name: "impl", slug: "impl", url: "/api/html/objects/impl"},
					{
						name: "renderer",
						slug: "renderer",
						url: "/api/html/objects/renderer",
					},
				],
			},
		],
	},
	{
		name: "@b9g/crank/standalone",
		slug: "standalone",
		categories: [
			{
				name: "Functions",
				slug: "functions",
				items: [
					{name: "jsx", slug: "jsx", url: "/api/standalone/functions/jsx"},
					{name: "html", slug: "html", url: "/api/standalone/functions/html"},
				],
			},
		],
	},
];
