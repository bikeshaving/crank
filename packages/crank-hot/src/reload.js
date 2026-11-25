// For esbuild's development server, which sends an event when a build has
// finished. The new bundle is evaluated in the page alongside the old ones.
if (typeof EventSource !== "undefined" && !globalThis.__crankReload) {
	const url = import.meta.url.split("?")[0];
	globalThis.__crankReload = new EventSource("/esbuild");
	globalThis.__crankReload.addEventListener("change", () => {
		import(url + "?hot=" + Date.now()).catch((err) => console.error(err));
	});
}
