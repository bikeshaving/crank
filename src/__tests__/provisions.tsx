/** @jsx createElement */
import {createElement, Children, Context, Element, Fragment} from "../index";
import {renderer} from "../dom";

// TODO: test typings
declare module "../index" {
	interface ProvisionMap {
		greeting: string;
	}
}

describe("context", () => {
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

	afterEach(() => {
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

		expect(document.body.innerHTML).toEqual("<div>Hello 1</div>");
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

		expect(document.body.innerHTML).toEqual("<div>Hello 1</div>");
	});

	test("missing provider", () => {
		renderer.render(
			<Nested depth={10}>
				<Consumer />
			</Nested>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div></div>");
	});

	test("update", () => {
		const Consumer1 = jest.fn(Consumer);
		renderer.render(
			<Provider>
				<Nested depth={10}>
					<Consumer1 />
				</Nested>
			</Provider>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div>Hello 1</div>");
		renderer.render(
			<Provider>
				<Nested depth={10}>
					<Consumer1 />
				</Nested>
			</Provider>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div>Hello 2</div>");
		renderer.render(
			<Provider>
				<Nested depth={10}>
					<Consumer1 />
				</Nested>
			</Provider>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div>Hello 3</div>");
		expect(Consumer1).toHaveBeenCalledTimes(3);
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
		expect(document.body.innerHTML).toEqual(
			"<div><div>Goodbye 1</div></div><div>Hello 1</div>",
		);
	});
});
