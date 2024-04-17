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
				});
			},
		},
	};
}
