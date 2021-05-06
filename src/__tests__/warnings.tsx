/** @jsx createElement */
import {createElement} from "../crank";
import {renderer} from "../dom";

describe("warnings", () => {
	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("sync component warns on implicit return", () => {
		const mock = jest.spyOn(console, "error").mockImplementation();
		function Component() {}

		renderer.render(<Component />, document.body);
		expect(mock).toHaveBeenCalledTimes(1);
		mock.mockRestore();
	});

	test("async component warns on implicit return", async () => {
		const mock = jest.spyOn(console, "error").mockImplementation();
		async function Component() {}

		await renderer.render(<Component />, document.body);
		expect(mock).toHaveBeenCalledTimes(1);
		mock.mockRestore();
	});

	test("sync generator component warns on implicit return", async () => {
		const mock = jest.spyOn(console, "error").mockImplementation();
		function* Component() {}

		await renderer.render(<Component />, document.body);
		expect(mock).toHaveBeenCalledTimes(1);
		mock.mockRestore();
	});
});
