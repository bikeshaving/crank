// For a development server which builds a whole new bundle when a file
// changes. A new bundle is evaluated in the page alongside the old ones.
//
// The page has to be told that there is one. esbuild's own server says so on
// an event stream, which this can listen to. Anything else which serves the
// bundles, such as a framework with a server of its own to reload first,
// calls update() when it is ready, or sends the same events. A change which
// the page cannot make to itself, such as one to code which only runs on a
// server, is for whatever knows that to load the page again.

// Shared by every copy of this module, because each bundle has one.
const state = (globalThis.__crankHot ||= {
	// The bundles of the page, by URL.
	bundles: new Set(),
	// The event streams which are being listened to, by URL.
	sources: new Map(),
	builds: 0,
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

// The data of an event, if it is JSON.
function parse(ev) {
	try {
		return JSON.parse(ev.data);
	} catch (_) {
		return undefined;
	}
}

/**
 * Called by each bundle with its own URL, and the URL of an event stream to
 * listen to, if there is one. The events are:
 *
 * - "change", which is what esbuild's server sends, or "update": a build
 *   has finished. The data may be JSON with the paths of the bundles which
 *   changed, as `updated`.
 * - "error": a build failed. The data is what to say.
 */
export function connect(url, events) {
	state.bundles.add(url.split("?")[0]);
	if (
		!events ||
		state.sources.has(events) ||
		typeof globalThis.EventSource === "undefined"
	) {
		return;
	}

	const source = new globalThis.EventSource(events);
	state.sources.set(events, source);
	const onupdate = (ev) => {
		const data = parse(ev);
		update(data && data.updated);
	};

	source.addEventListener("change", onupdate);
	source.addEventListener("update", onupdate);
	source.addEventListener("error", (ev) => {
		// The stream itself failing is also an event with this name.
		if (typeof ev.data === "string") {
			console.error(ev.data);
		}
	});
}
