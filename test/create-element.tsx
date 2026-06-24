import {suite} from "uvu";
import * as Assert from "uvu/assert";
import {createElement} from "../src/crank.js";

const test = suite("createElement");

test("does not mutate the caller's props when adding a child", () => {
	const props = {id: "x"};
	const el = createElement("div", props, "child");
	Assert.equal(props, {id: "x"});
	Assert.is("children" in props, false);
	Assert.is((el.props as any).children, "child");
});

test("does not mutate the caller's props with multiple children", () => {
	const props = {id: "x"};
	const el = createElement("div", props, "a", "b");
	Assert.equal(props, {id: "x"});
	Assert.equal((el.props as any).children, ["a", "b"]);
});

test("a reused props object yields independent elements (#356)", () => {
	const props = {class: "shared"};
	const a = createElement("div", props, "a");
	const b = createElement("div", props, "b");
	Assert.is((a.props as any).children, "a");
	Assert.is((b.props as any).children, "b");
	Assert.is("children" in props, false);
});

test("passes props through when there are no children", () => {
	const props = {id: "x"};
	const el = createElement("div", props);
	Assert.equal(el.props, {id: "x"});
});

test.run();
