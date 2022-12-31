import {promises as FS} from "fs";
import type {Plugin} from "esbuild";
import postcss from "postcss";
import type {AcceptedPlugin} from "postcss";

export function postcssPlugin({
	plugins,
}: {
	plugins: Array<AcceptedPlugin>;
}): Plugin {
	return {
		name: "postcss",
		setup(build) {
			build.onLoad({filter: /.\.(css)$/, namespace: "file"}, async (args) => {
				let contents = await FS.readFile(args.path, "utf8");
				const result = await postcss(plugins).process(contents, {
					from: args.path,
					map: true,
				});
				contents = result.css;
				return {loader: "css", contents};
			});
		},
	};
}
