import {describe, test, expect} from "@b9g/libuild/test";
import {createElement, tags, Fragment, Portal} from "../src/crank.js";
import {renderer} from "../src/html.js";

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

	test("Fragment and Portal tags pass through", () => {
		const el = tags[Fragment](null, "a", "b");
		expect(el.tag).toBe(Fragment);
		expect(el.props.children).toEqual(["a", "b"]);
		expect((tags as any)[Portal]({root: null}).tag).toBe(Portal);
	});

	test("is not thenable", () => {
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
