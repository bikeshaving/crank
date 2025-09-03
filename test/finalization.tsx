import {createElement} from "../src/crank.js";
import {renderer} from "../src/dom.js";
import {suite} from "uvu";
import * as Assert from "uvu/assert";

const test = suite("finalization");

test.skip("automatic unmount on garbage collection", async () => {
	// Note: This test is difficult to write reliably because garbage collection
	// timing is non-deterministic. We're skipping it but keeping it here to
	// document the expected behavior.

	let unmounted = false;

	function* Component() {
		try {
			while (true) {
				yield <div>Hello</div>;
			}
		} finally {
			unmounted = true;
		}
	}

	// Create a root element that we can garbage collect
	let root: HTMLDivElement | null = document.createElement("div");
	document.body.appendChild(root);

	// Render component
	renderer.render(<Component />, root);
	Assert.is(root.innerHTML, "<div>Hello</div>");
	Assert.is(unmounted, false);

	// Remove root from DOM and clear reference
	document.body.removeChild(root);
	root = null;

	// Force garbage collection (this is not standard and won't work in all environments)
	// In a real browser environment, we'd need to wait for GC to happen naturally
	if ((globalThis as any).gc) {
		(globalThis as any).gc();
		// Even with explicit gc(), FinalizationRegistry callbacks are async
		await new Promise((resolve) => setTimeout(resolve, 100));
		Assert.is(unmounted, true);
	}
});

test("manual unmount still works", () => {
	let unmounted = false;

	function* Component() {
		try {
			while (true) {
				yield <div>Hello</div>;
			}
		} finally {
			unmounted = true;
		}
	}

	const root = document.createElement("div");
	document.body.appendChild(root);

	// Render component
	renderer.render(<Component />, root);
	Assert.is(root.innerHTML, "<div>Hello</div>");
	Assert.is(unmounted, false);

	// Manual unmount by rendering null
	renderer.render(null, root);
	Assert.is(root.innerHTML, "");
	Assert.is(unmounted, true);

	document.body.removeChild(root);
});

test("FinalizationRegistry is used when available", () => {
	// Simply verify that the registry property exists on the renderer
	// when FinalizationRegistry is available
	if (typeof FinalizationRegistry !== "undefined") {
		Assert.ok(renderer.registry instanceof FinalizationRegistry);
	} else {
		Assert.is(renderer.registry, undefined);
	}
});

test("multiple roots can be tracked independently", () => {
	const unmountedRoots: string[] = [];

	function* Component({id}: {id: string}) {
		try {
			while (true) {
				yield <div>Component {id}</div>;
			}
		} finally {
			unmountedRoots.push(id);
		}
	}

	const root1 = document.createElement("div");
	const root2 = document.createElement("div");
	document.body.appendChild(root1);
	document.body.appendChild(root2);

	// Render to both roots
	renderer.render(<Component id="1" />, root1);
	renderer.render(<Component id="2" />, root2);

	Assert.is(root1.innerHTML, "<div>Component 1</div>");
	Assert.is(root2.innerHTML, "<div>Component 2</div>");
	Assert.equal(unmountedRoots, []);

	// Unmount first root
	renderer.render(null, root1);
	Assert.is(root1.innerHTML, "");
	Assert.equal(unmountedRoots, ["1"]);

	// Second root should still be mounted
	Assert.is(root2.innerHTML, "<div>Component 2</div>");

	// Unmount second root
	renderer.render(null, root2);
	Assert.is(root2.innerHTML, "");
	Assert.equal(unmountedRoots, ["1", "2"]);

	document.body.removeChild(root1);
	document.body.removeChild(root2);
});

test.run();
