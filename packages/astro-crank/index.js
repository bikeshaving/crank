export default function crankIntegration() {
	return {
		name: "astro-crank",
		hooks: {
			"astro:config:setup": ({addRenderer}) => {
				addRenderer({
					name: "astro-crank",
					clientEntrypoint: "astro-crank/client.js",
					serverEntrypoint: "astro-crank/server.js",
					jsxImportSource: "@b9g/crank",
					jsxTransformOptions: async () => {
						const babelPluginReactJSX = await import(
							"@babel/plugin-transform-react-jsx"
						);
						// “Come, let us go down and there confuse their language, so that
						// they may not understand one another's speech.”
						// — Genesis 11:7
						const jsx =
							babelPluginReactJSX.default.default ||
							babelPluginReactJSX.default;
						return {
							plugins: [
								jsx(
									{},
									{
										runtime: "automatic",
										importSource: "@b9g/crank",
									},
								),
							],
						};
					},
				});
			},
		},
	};
}
