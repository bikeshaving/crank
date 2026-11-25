// For a development server which builds a whole new bundle when a file
// changes. A new bundle is evaluated in the page alongside the old ones.
//
// The page has to be told that there is one. esbuild's own server says so on
// an event stream. Anything else which serves the bundles calls
// `__crankHot.update()` in the page.

// Shared by every copy of this module, because each bundle has one.
const state = (globalThis.__crankHot ||= {
	// The bundles of the page, by URL.
	bundles: new Set(),
	builds: 0,
	isListening: false,
	load: (url) => import(url),
	update,
});

/**
 * Evaluates the newest build of the bundles of the page.
 *
 * @param {Array<string>} [updated] - The paths of the bundles which changed.
 * Without it, every bundle is evaluated again.
 */
export function update(updated) {
	const loads = [];
	state.builds++;
	for (const url of state.bundles) {
		if (!updated || updated.includes(new URL(url).pathname)) {
			loads.push(
				state
					.load(`${url}?hot=${state.builds}`)
					.catch((err) => console.error(err)),
			);
		}
	}

	return Promise.all(loads);
}

/**
 * Called by each bundle with its own URL, and whether to listen to esbuild's
 * server, which sends an event with the bundles which changed when a build
 * has finished.
 */
export function connect(url, listen) {
	state.bundles.add(url.split("?")[0]);
	if (
		!listen ||
		state.isListening ||
		typeof globalThis.EventSource === "undefined"
	) {
		return;
	}

	state.isListening = true;
	new globalThis.EventSource("/esbuild").addEventListener("change", (ev) => {
		let updated;
		try {
			updated = JSON.parse(ev.data).updated;
		} catch (_) {
			updated = undefined;
		}

		update(updated);
	});
}
