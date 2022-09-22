import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

import {createElement, Fragment} from "../src/crank.js";
import type {Children, Context, Element} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("provisions");

// TODO: test typings
declare module "../src/crank.js" {
	interface ProvisionMap {
		greeting: string;
	}
}

function* Provider(this: Context): Generator<Element> {
	let i = 1;
	for (const {children, message = "Hello "} of this) {
		this.provide("greeting", message + i++);
		yield <Fragment>{children}</Fragment>;
	}
}

function Nested(
	this: Context,
	{depth, children}: {depth: number; children: Children},
): Element {
	if (depth <= 0) {
		return <Fragment>{children}</Fragment>;
	} else {
		return <Nested depth={depth - 1}>{children}</Nested>;
	}
}

function Consumer(this: Context): Element {
	const greeting = this.consume("greeting");
	return <div>{greeting}</div>;
}

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("basic", () => {
	renderer.render(
		<Provider>
			<Consumer />
		</Provider>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div>Hello 1</div>");
});

test("nested", () => {
	renderer.render(
		<Provider>
			<Nested depth={10}>
				<Consumer />
			</Nested>
		</Provider>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div>Hello 1</div>");
});

test("missing provider", () => {
	renderer.render(
		<Nested depth={10}>
			<Consumer />
		</Nested>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div></div>");
});

test("update", () => {
	const Consumer1 = Sinon.fake(Consumer);
	renderer.render(
		<Provider>
			<Nested depth={10}>
				<Consumer1 />
			</Nested>
		</Provider>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div>Hello 1</div>");
	renderer.render(
		<Provider>
			<Nested depth={10}>
				<Consumer1 />
			</Nested>
		</Provider>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div>Hello 2</div>");
	renderer.render(
		<Provider>
			<Nested depth={10}>
				<Consumer1 />
			</Nested>
		</Provider>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div>Hello 3</div>");
	Assert.is(Consumer1.callCount, 3);
});

test("overwritten", () => {
	renderer.render(
		<Provider>
			<div>
				<Provider message="Goodbye ">
					<Consumer />
				</Provider>
			</div>
			<Consumer />
		</Provider>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><div>Goodbye 1</div></div><div>Hello 1</div>",
	);
});

test.run();
