import {describe, test, expect} from "@b9g/libuild/test";
import {createElement} from "../src/crank.js";

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
