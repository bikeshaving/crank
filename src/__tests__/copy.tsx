/** @jsx createElement */
import {Copy, createElement, Element} from "../index";
import {renderer} from "../dom";

describe("Copy", () => {
	afterEach(async () => {
		document.body.innerHTML = "";
		await renderer.render(null, document.body);
	});

	test("copy of nothing", () => {
		renderer.render(<Copy />, document.body);
		expect(document.body.innerHTML).toEqual("");
	});

	test("copy of nothing keyed", () => {
		renderer.render(<Copy crank-key="key" />, document.body);
		expect(document.body.innerHTML).toEqual("");
	});

	test("copy intrinsic", () => {
		renderer.render(<div>Hello</div>, document.body);
		expect(document.body.innerHTML).toEqual("<div>Hello</div>");
		renderer.render(<Copy />, document.body);
		expect(document.body.innerHTML).toEqual("<div>Hello</div>");
	});

	test("cpoy component", () => {
		function Component({message}: {message: string}): Element {
			return <span>{message}</span>;
		}

		renderer.render(
			<div>
				<Component message="Hello" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		renderer.render(
			<div>
				<Copy />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
	});

	test("copy array return value", () => {
		function Component({copy}: {copy?: boolean}) {
			if (copy) {
				return <Copy />;
			} else {
				return [1, 2, 3];
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("123");
		renderer.render(<Component copy={true} />, document.body);
		expect(document.body.innerHTML).toEqual("123");
	});

	test("copy children", () => {
		let spans = [
			<span crank-key="2">2</span>,
			<span crank-key="3">3</span>,
			<span crank-key="4">4</span>,
			<span crank-key="5">5</span>,
			<span crank-key="6">6</span>,
		];
		renderer.render(
			<div>
				<span>1</span>
				{spans}
				<span>7</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span></div>",
		);
		const span1 = document.body.firstChild!.childNodes[0];
		const span2 = document.body.firstChild!.childNodes[1];
		const span3 = document.body.firstChild!.childNodes[2];
		const span4 = document.body.firstChild!.childNodes[3];
		const span5 = document.body.firstChild!.childNodes[4];
		const span6 = document.body.firstChild!.childNodes[5];
		const span7 = document.body.firstChild!.childNodes[6];
		spans = spans.reverse().map((el) => <Copy crank-key={el.key} />);
		renderer.render(
			<div>
				<span>1</span>
				{spans}
				<span>7</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><span>1</span><span>6</span><span>5</span><span>4</span><span>3</span><span>2</span><span>7</span></div>",
		);
		renderer.render(
			<div>
				<span>1</span>
				{spans}
				<span>7</span>
			</div>,
			document.body,
		);
		expect(document.body.firstChild!.childNodes[0]).toBe(span1);
		expect(document.body.firstChild!.childNodes[1]).toBe(span6);
		expect(document.body.firstChild!.childNodes[2]).toBe(span5);
		expect(document.body.firstChild!.childNodes[3]).toBe(span4);
		expect(document.body.firstChild!.childNodes[4]).toBe(span3);
		expect(document.body.firstChild!.childNodes[5]).toBe(span2);
		expect(document.body.firstChild!.childNodes[6]).toBe(span7);
		spans = spans.reverse().map((el) => <Copy crank-key={el.key} />);
		renderer.render(
			<div>
				<span>1</span>
				{spans}
				<span>7</span>
			</div>,
			document.body,
		);
		expect(document.body.firstChild!.childNodes[0]).toBe(span1);
		expect(document.body.firstChild!.childNodes[1]).toBe(span2);
		expect(document.body.firstChild!.childNodes[2]).toBe(span3);
		expect(document.body.firstChild!.childNodes[3]).toBe(span4);
		expect(document.body.firstChild!.childNodes[4]).toBe(span5);
		expect(document.body.firstChild!.childNodes[5]).toBe(span6);
		expect(document.body.firstChild!.childNodes[6]).toBe(span7);
	});
});
