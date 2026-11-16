import {suite} from "uvu";
import * as Assert from "uvu/assert";

import {createElement} from "../src/crank.js";
import type {Context} from "../src/crank.js";
import {DOMRenderer, renderer} from "../src/dom.js";

const test = suite("componentId");

test.before.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("basic access returns a crank- prefixed string", () => {
	let capturedId: string | undefined;
	function Component(this: Context) {
		capturedId = this.componentId;
		return <div />;
	}

	renderer.render(<Component />, document.body);
	Assert.is(capturedId!, "crank-109thto");
});

test("two instances of the same component get identical IDs", () => {
	const ids: string[] = [];
	function Component(this: Context) {
		ids.push(this.componentId);
		return <div />;
	}

	renderer.render(
		<div>
			<Component />
			<Component />
		</div>,
		document.body,
	);
	Assert.is(ids.length, 2);
	Assert.is(ids[0], ids[1]);
});

test("different components get different IDs", () => {
	let idA: string | undefined;
	let idB: string | undefined;

	function ComponentA(this: Context) {
		idA = this.componentId;
		return <div />;
	}

	function ComponentB(this: Context) {
		idB = this.componentId;
		return <div />;
	}

	renderer.render(
		<div>
			<ComponentA />
			<ComponentB />
		</div>,
		document.body,
	);
	Assert.ok(idA !== idB);
});

test("different components from the same HOC get different IDs", () => {
	let idA: string | undefined;
	let idB: string | undefined;
	let idC: string | undefined;

	function Hoc(Component: any) {
		return function Wrapped(props: any) {
			return <Component {...props} />;
		};
	}

	const ComponentA = Hoc(function ComponentA(this: Context) {
		idA = this.componentId;
		return <div />;
	});

	const ComponentB = Hoc(function ComponentB(this: Context) {
		idB = this.componentId;
		return <div />;
	});

	const ComponentC = Hoc((_props: unknown, ctx: Context) => {
		idC = ctx.componentId;
		return <div />;
	});

	renderer.render(
		<div>
			<ComponentA />
			<ComponentB />
			<ComponentC />
		</div>,
		document.body,
	);
	Assert.ok(idA !== idB);
	Assert.ok(idA !== idC);
});

test("different components inside the same HOC get different IDs", () => {
	let idA: string | undefined;
	let idB: string | undefined;

	function ComponentAInner(this: Context) {
		return <div />;
	}

	function ComponentBInner(this: Context) {
		return <div />;
	}

	function Hoc(Component: any) {
		return function Wrapped(this: Context, props: any) {
			if (Component === ComponentAInner) idA = this.componentId;
			if (Component === ComponentBInner) idB = this.componentId;
			return <Component {...props} />;
		};
	}

	const ComponentA = Hoc(ComponentAInner);
	const ComponentB = Hoc(ComponentBInner);

	renderer.render(
		<div>
			<ComponentA />
			<ComponentB />
		</div>,
		document.body,
	);
	Assert.ok(idA !== idB);
});

test("componentId is stable across re-renders in a generator component", () => {
	const ids: string[] = [];
	function* Component(this: Context) {
		for (const _ of this) {
			ids.push(this.componentId);
			yield <div />;
		}
	}

	renderer.render(<Component />, document.body);
	renderer.render(<Component />, document.body);
	renderer.render(<Component />, document.body);

	Assert.is(ids.length, 3);
	Assert.is(ids[0], ids[1]);
	Assert.is(ids[1], ids[2]);
});

test("same ID across separate renderer instances", () => {
	function MyComponent(this: Context) {
		return <div>{this.componentId}</div>;
	}

	const rendererA = new DOMRenderer();
	const rendererB = new DOMRenderer();

	const rootA = document.createElement("div");
	const rootB = document.createElement("div");
	document.body.appendChild(rootA);
	document.body.appendChild(rootB);

	rendererA.render(<MyComponent />, rootA);
	rendererB.render(<MyComponent />, rootB);

	Assert.is(rootA.innerHTML, rootB.innerHTML);

	rendererA.render(null, rootA);
	rendererB.render(null, rootB);
});

test("different components in same renderer get different IDs", () => {
	let idA: string | undefined;
	let idB: string | undefined;

	function ComponentA(this: Context) {
		idA = this.componentId;
		return <div />;
	}

	function ComponentB(this: Context) {
		idB = this.componentId;
		return <div />;
	}

	const r = new DOMRenderer();
	const root = document.createElement("div");
	document.body.appendChild(root);

	r.render(
		<div>
			<ComponentA />
			<ComponentB />
		</div>,
		root,
	);

	Assert.ok(idA!.startsWith("crank-"));
	Assert.ok(idB!.startsWith("crank-"));
	Assert.not.equal(idA, idB);

	r.render(null, root);
});

test.run();
