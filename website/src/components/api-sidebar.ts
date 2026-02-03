import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";
import type {DocInfo} from "../models/document.js";
import {Search} from "./search.js";

export interface APIModule {
	name: string;
	slug: string;
	url: string;
	categories: Array<{
		name: string;
		slug: string;
		items: Array<{
			name: string;
			url: string;
		}>;
	}>;
}

// Category display names and sort order
const CATEGORY_ORDER = [
	"functions",
	"classes",
	"interfaces",
	"types",
	"components",
	"objects",
];

function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function buildAPIModules(docs: DocInfo[]): APIModule[] {
	const moduleMap = new Map<
		string,
		{
			name: string;
			slug: string;
			url: string;
			categories: Map<
				string,
				{name: string; slug: string; items: Array<{name: string; url: string}>}
			>;
		}
	>();

	for (const doc of docs) {
		// Parse URL: /api, /api/{module}, /api/{module}/{category}/{item}
		const parts = doc.url.split("/").filter(Boolean); // ["api", "core", "functions", "createElement"]

		if (parts.length < 2) continue; // Skip /api itself

		const moduleSlug = parts[1];

		if (!moduleMap.has(moduleSlug)) {
			moduleMap.set(moduleSlug, {
				name: moduleSlug, // Will be overwritten by index.md title
				slug: moduleSlug,
				url: `/api/${moduleSlug}`,
				categories: new Map(),
			});
		}

		const mod = moduleMap.get(moduleSlug)!;

		if (parts.length === 2) {
			// Module index: /api/{module}
			mod.name = doc.attributes.title;
		} else if (parts.length === 4) {
			// Item: /api/{module}/{category}/{item}
			const categorySlug = parts[2];

			if (!mod.categories.has(categorySlug)) {
				mod.categories.set(categorySlug, {
					name: capitalize(categorySlug),
					slug: categorySlug,
					items: [],
				});
			}

			mod.categories.get(categorySlug)!.items.push({
				name: doc.attributes.title,
				url: doc.url,
			});
		}
	}

	// Convert to array and sort
	const modules = Array.from(moduleMap.values()).map((mod) => ({
		...mod,
		categories: Array.from(mod.categories.values())
			.sort((a, b) => {
				const aIndex = CATEGORY_ORDER.indexOf(a.slug);
				const bIndex = CATEGORY_ORDER.indexOf(b.slug);
				return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
			})
			.map((cat) => ({
				...cat,
				items: cat.items.sort((a, b) => a.name.localeCompare(b.name)),
			})),
	}));

	// Sort modules: core first, then alphabetically
	modules.sort((a, b) => {
		if (a.slug === "core") return -1;
		if (b.slug === "core") return 1;
		return a.name.localeCompare(b.name);
	});

	return modules;
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
	modules: APIModule[];
	url: string;
}) {
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
			${modules.map(
				(mod) => jsx`
				<div class=${moduleHeaderStyle}>
					<a
						href=${mod.url}
						class=${css`
							text-decoration: none;
						`}
						aria-current=${url === mod.url && "page"}
					>${mod.name}</a>
				</div>
				${mod.categories.map(
					(category) => jsx`
					<div class=${categoryStyle}>${category.name}</div>
					${category.items.map(
						(item) => jsx`
						<a
							href=${item.url}
							class=${linkStyle}
							aria-current=${url === item.url && "page"}
						>${item.name}</a>
					`,
					)}
				`,
				)}
			`,
			)}
		</div>
	`;
}
