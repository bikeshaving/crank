import {describe, test, expect} from "@b9g/libuild/test";
import {createElement, h, tags, Fragment} from "../src/crank.js";
import {renderer} from "../src/html.js";

describe("h", () => {
	test("plain tag", () => {
		expect(h("span", {id: "x"}, "a")).toEqual(
			createElement("span", {id: "x"}, "a"),
		);
	});

	test("id and classes", () => {
		const el = h("div#app.card.wide");
		expect(el.tag).toBe("div");
		expect(el.props).toEqual({id: "app", class: "card wide"});
	});

	test("defaults to div", () => {
		expect(h(".card").tag).toBe("div");
		expect(h("#app").props).toEqual({id: "app"});
	});

	test("any order", () => {
		expect(h("p.a#x.b").props).toEqual({id: "x", class: "a b"});
	});

	test("merges class prop and lets id prop win", () => {
		const el = h("div#a.x", {id: "b", class: "y"});
		expect(el.props).toEqual({id: "b", class: "x y"});
	});

	test("merges class objects", () => {
		const el = h("div.x.y", {class: {active: true, hidden: false}});
		expect(el.props).toEqual({
			class: {"x y": true, active: true, hidden: false},
		});
		expect(renderer.render(el)).toBe('<div class="x y active"></div>');
	});

	test("merges className", () => {
		const el = h("div.x", {className: "y"});
		expect(el.props).toEqual({class: "x y"});
		expect(renderer.render(el)).toBe('<div class="x y"></div>');
	});

	test("does not mutate props", () => {
		const props = {class: "y"};
		h("div.x", props, "child");
		expect(props).toEqual({class: "y"});
	});

	test("custom elements", () => {
		expect(h("my-element.big").tag).toBe("my-element");
	});

	test("components and symbols pass through", () => {
		function Component() {
			return null;
		}
		expect(h(Component, {a: 1}).tag).toBe(Component);
		expect(h(Fragment, null, "a", "b").props.children).toEqual(["a", "b"]);
	});

	test("renders", () => {
		expect(renderer.render(h("div#app.card", null, h("p", null, "Hi")))).toBe(
			'<div id="app" class="card"><p>Hi</p></div>',
		);
	});
});

describe("tags", () => {
	test("creates elements for any tag name", () => {
		const el = tags.div({id: "x"}, "child");
		expect(el.tag).toBe("div");
		expect(el.props).toEqual({id: "x", children: "child"});
		expect(tags["my-element"](null).tag).toBe("my-element");
	});

	test("matches createElement", () => {
		const {ul, li} = tags;
		const a = ul({class: "list"}, li(null, "one"), li(null, "two"));
		const b = createElement(
			"ul",
			{class: "list"},
			createElement("li", null, "one"),
			createElement("li", null, "two"),
		);
		expect(a).toEqual(b);
	});

	test("props are optional", () => {
		expect(tags.br().props).toEqual({});
		expect(tags.p(undefined, "text").props).toEqual({children: "text"});
	});

	test("caches each tag function", () => {
		expect(tags.span).toBe(tags.span);
		expect(tags.span).not.toBe(tags.div);
	});

	test("ignores symbols and then", () => {
		expect((tags as any)[Symbol.iterator]).toBe(undefined);
		expect((tags as any).then).toBe(undefined);
	});

	test("does not inherit from Object.prototype", () => {
		expect((tags as any).constructor(null).tag).toBe("constructor");
		expect((tags as any).toString(null).tag).toBe("toString");
	});

	test("renders", () => {
		const {div, h1, p} = tags;
		const html = renderer.render(
			div({class: "card"}, h1(null, "Hello"), p(null, "World")),
		);
		expect(html).toBe('<div class="card"><h1>Hello</h1><p>World</p></div>');
	});
});

describe("createElement", () => {
	test("does not mutate the caller's props when adding a child", () => {
		const props = {id: "x"};
		const el = createElement("div", props, "child");
		expect(props).toEqual({id: "x"});
		expect("children" in props).toBe(false);
		expect((el.props as any).children).toBe("child");
	});

	test("does not mutate the caller's props with multiple children", () => {
		const props = {id: "x"};
		const el = createElement("div", props, "a", "b");
		expect(props).toEqual({id: "x"});
		expect((el.props as any).children).toEqual(["a", "b"]);
	});

	test("a reused props object yields independent elements (#356)", () => {
		const props = {class: "shared"};
		const a = createElement("div", props, "a");
		const b = createElement("div", props, "b");
		expect((a.props as any).children).toBe("a");
		expect((b.props as any).children).toBe("b");
		expect("children" in props).toBe(false);
	});

	test("passes props through when there are no children", () => {
		const props = {id: "x"};
		const el = createElement("div", props);
		expect(el.props).toEqual({id: "x"});
	});
});
