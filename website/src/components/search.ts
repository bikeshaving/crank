import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";
import type {Context} from "@b9g/crank";

interface SearchResult {
	url: string;
	meta: {title?: string};
	excerpt: string;
}

interface PagefindResult {
	url: string;
	meta: {title?: string};
	excerpt: string;
}

interface Pagefind {
	search: (
		query: string,
	) => Promise<{results: Array<{data: () => Promise<PagefindResult>}>}>;
}

declare global {
	interface Window {
		pagefind?: Pagefind;
	}
}

export async function* Search(this: Context) {
	let query = "";
	let results: SearchResult[] = [];
	let isOpen = false;
	let pagefind: Pagefind | null = null;
	let loading = false;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	const loadPagefind = async () => {
		if (pagefind) return pagefind;
		if (typeof window === "undefined") return null;

		try {
			// Pagefind generates its assets at /pagefind/
			// Use Function constructor to avoid bundler trying to resolve the import
			const importPagefind = new Function(
				'return import("/pagefind/pagefind.js")',
			);
			pagefind = await importPagefind();
			return pagefind;
		} catch (e) {
			console.warn("Pagefind not available (run static build first)", e);
			return null;
		}
	};

	const doSearch = async (q: string) => {
		if (!q.trim()) {
			results = [];
			this.refresh();
			return;
		}

		loading = true;
		this.refresh();

		const pf = await loadPagefind();
		if (!pf) {
			loading = false;
			this.refresh();
			return;
		}

		const search = await pf.search(q);
		const data = await Promise.all(
			search.results.slice(0, 8).map((r) => r.data()),
		);

		results = data.map((d) => ({
			url: d.url,
			meta: d.meta,
			excerpt: d.excerpt,
		}));
		loading = false;
		this.refresh();
	};

	const onInput = (e: InputEvent) => {
		query = (e.target as HTMLInputElement).value;
		isOpen = true;

		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => doSearch(query), 150);
	};

	const onFocus = () => {
		isOpen = true;
		this.refresh();
	};

	const onBlur = () => {
		// Delay to allow click on results
		setTimeout(() => {
			isOpen = false;
			this.refresh();
		}, 200);
	};

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Escape") {
			isOpen = false;
			(e.target as HTMLInputElement).blur();
			this.refresh();
		}
	};

	for ({} of this) {
		yield jsx`
			<div class=${css`
				position: relative;
				margin-bottom: 1rem;
			`}>
				<input
					type="search"
					placeholder="Search..."
					value=${query}
					oninput=${onInput}
					onfocus=${onFocus}
					onblur=${onBlur}
					onkeydown=${onKeyDown}
					class=${css`
						width: 100%;
						padding: 0.5rem 0.75rem;
						font-size: 0.9rem;
						border: 1px solid var(--text-color);
						border-radius: 4px;
						background: var(--bg-color);
						color: var(--text-color);
						box-sizing: border-box;

						&::placeholder {
							opacity: 0.5;
						}

						&:focus {
							outline: none;
							border-color: var(--highlight-color);
						}
					`}
				/>

				${
					isOpen && (query.trim() || loading)
						? jsx`
					<div class=${css`
						position: absolute;
						top: 100%;
						left: 0;
						right: 0;
						margin-top: 0.25rem;
						background: var(--bg-color);
						border: 1px solid var(--text-color);
						border-radius: 4px;
						max-height: 400px;
						overflow-y: auto;
						z-index: 100;
						text-align: left;

						@media screen and (min-width: 800px) {
							min-width: 300px;
						}
					`}>
						${
							loading
								? jsx`
							<div class=${css`
								padding: 1rem;
								opacity: 0.6;
								font-size: 0.85rem;
							`}>Searching...</div>
						`
								: results.length > 0
									? results.map(
											(r) => jsx`
							<a
								href=${r.url}
								class=${css`
									display: block;
									padding: 0.75rem;
									text-decoration: none;
									border-bottom: 1px solid var(--text-color);
									border-bottom-color: rgba(128, 128, 128, 0.2);

									&:last-child {
										border-bottom: none;
									}

									&:hover {
										background: rgba(128, 128, 128, 0.1);
									}
								`}
							>
								<div class=${css`
									font-weight: 600;
									font-size: 0.9rem;
									margin-bottom: 0.25rem;
									color: var(--highlight-color);
								`}>${r.meta.title || r.url}</div>
								<div
									class=${css`
										font-size: 0.8rem;
										line-height: 1.4;
										color: var(--text-color);

										mark {
											background: var(--highlight-color);
											color: var(--bg-color);
											padding: 0 2px;
											border-radius: 2px;
										}
									`}
									innerHTML=${r.excerpt}
								/>
							</a>
						`,
										)
									: query.trim()
										? jsx`
							<div class=${css`
								padding: 1rem;
								opacity: 0.6;
								font-size: 0.85rem;
							`}>No results found</div>
						`
										: null
						}
					</div>
				`
						: null
				}
			</div>
		`;
	}
}
