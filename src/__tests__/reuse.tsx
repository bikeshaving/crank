/** @jsx createElement */
import {createElement} from "../index";
import {renderer} from "../dom";

describe("element reuse", () => {
	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("reused intrinsic", () => {
		const el = <span>1</span>;
		renderer.render(
			<div>
				{el}
				{el}
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual(
			"<div><span>1</span><span>1</span></div>",
		);
	});

	test("reused intrinsic with element in between", () => {
		const el = <span>1</span>;
		renderer.render(
			<div>
				{el}
				<span>2</span>
				{el}
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual(
			"<div><span>1</span><span>2</span><span>1</span></div>",
		);
	});

	test("reused function component", () => {
		const fn = jest.fn();
		function Component() {
			fn();
			return <span>1</span>;
		}

		const el = <Component />;
		renderer.render(
			<div>
				{el}
				{el}
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual(
			"<div><span>1</span><span>1</span></div>",
		);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	test("reused generator component", () => {
		const fn = jest.fn();
		function* Component() {
			fn();
			while (true) {
				yield <span>1</span>;
			}
		}

		const el = <Component />;
		renderer.render(
			<div>
				{el}
				{el}
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual(
			"<div><span>1</span><span>1</span></div>",
		);
		expect(fn).toHaveBeenCalledTimes(2);
	});
});
