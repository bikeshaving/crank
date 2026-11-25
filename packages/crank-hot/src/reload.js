// For esbuild's development server, which sends an event when a build has
// finished. The new bundle is evaluated in the page alongside the old ones.
if (typeof EventSource !== "undefined" && !globalThis.__crankReload) {
	const url = import.meta.url.split("?")[0];
	const path = new URL(url).pathname;
	globalThis.__crankReload = new EventSource("/esbuild");
	globalThis.__crankReload.addEventListener("change", (ev) => {
		// The event lists the files which the build changed.
		let updated;
		try {
			updated = JSON.parse(ev.data).updated;
		} catch (_) {
			updated = undefined;
		}

		if (!updated || updated.includes(path)) {
			import(url + "?hot=" + Date.now()).catch((err) => console.error(err));
		}
	});
}
