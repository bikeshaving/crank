/// <ref lib="dom" />
import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";
import {createElement} from "../src/crank.js";

import {renderer} from "../src/dom.js";

const test = suite("hydration");

test.skip("simple", () => {
	document.body.innerHTML = "<button>Click</button>";
	const button = document.body.firstChild as HTMLButtonElement;
	const onclick = Sinon.fake();
	renderer.hydrate(<button onclick={onclick}>Click</button>, document.body);

	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(document.body.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
});

test.run();
