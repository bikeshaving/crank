/* @jsx createElement */
import {createElement} from "../repeat";

describe("repeat", () => {
	test("basic", () => {
		expect(<div>Hello</div>).toEqual({
			props: {
				children: ["Hello"],
			},
			type: "div",
		});
	});
});
