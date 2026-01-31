import {jsx} from "@b9g/crank/standalone";

export interface GiscusProps {
	repo: string;
	repoId: string;
	category: string;
	categoryId: string;
	mapping?: string;
	strict?: boolean;
	reactionsEnabled?: boolean;
	emitMetadata?: boolean;
	inputPosition?: "top" | "bottom";
	theme?: string;
	lang?: string;
	loading?: "lazy" | "eager";
}

export function Giscus({
	repo,
	repoId,
	category,
	categoryId,
	mapping = "pathname",
	strict = false,
	reactionsEnabled = true,
	emitMetadata = false,
	inputPosition = "bottom",
	theme = "preferred_color_scheme",
	lang = "en",
	loading = "lazy",
}: GiscusProps) {
	return jsx`
		<script
			src="https://giscus.app/client.js"
			data-repo=${repo}
			data-repo-id=${repoId}
			data-category=${category}
			data-category-id=${categoryId}
			data-mapping=${mapping}
			data-strict=${strict ? "1" : "0"}
			data-reactions-enabled=${reactionsEnabled ? "1" : "0"}
			data-emit-metadata=${emitMetadata ? "1" : "0"}
			data-input-position=${inputPosition}
			data-theme=${theme}
			data-lang=${lang}
			data-loading=${loading}
			crossorigin="anonymous"
			async
		/>
	`;
}
