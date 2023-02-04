/* eslint @typescript-eslint/no-unused-vars: "off" */
import {suite} from "uvu";
import {Component, Context, createElement} from "../src/crank.js";

declare global {
	module JSX {
		interface IntrinsicElements {
			myIntrinsic: {
				message: string;
			};
		}
	}
}

type MyProps = {
	message: string;
};

const test = suite("types");

let elem: any;
test("createElement", () => {
	const MyFunctionComponent: Component<MyProps> = function (this, props) {
		const ctx: Context<MyProps> = this;
		let message: string = props.message;
		// @ts-expect-error
		let unexpected = props.unexpected;

		return <div></div>;
	};

	// @ts-expect-error
	elem = createElement(MyFunctionComponent, {poop: 1});

	// @ts-expect-error
	elem = createElement(MyFunctionComponent, {message: 1});

	elem = createElement(MyFunctionComponent, {message: "hello"});

	elem = createElement(
		MyFunctionComponent,
		{message: "hello"},
		"a",
		1,
		{},
		[],
		() => {},
	);
	// @ts-expect-error
	elem = createElement("myIntrinsic", {poop: 1});

	// @ts-expect-error
	elem = createElement("myIntrinsic", {message: 1});

	elem = createElement("myIntrinsic", {message: "hello"});

	elem = createElement(
		"myIntrinsic",
		{message: "hello"},
		"a",
		1,
		{},
		[],
		() => {},
	);
});

test("not components", () => {
	// @ts-expect-error
	const MyString: Component = "Hello";

	// @ts-expect-error
	const MyNumber: Component = 10;

	// @ts-expect-error
	const MyBoolean: Component = true;

	// @ts-expect-error
	const MyNull: Component = null;

	// @ts-expect-error
	const MyUndefined: Component = undefined;

	// Not entirely sure why this one doesn't error anymore. seems that <a></a> returns
	// any, while createElement('a') returns Element<any>.
	// skip @ts-expect-error
	// const MyElement: Component = <a></a>;

	// @ts-expect-error
	const NotComponent: Component = {};
});

test("Component", () => {
	const MyFunctionComponent: Component<MyProps> = function (this, props) {
		const ctx: Context<MyProps> = this;
		let message: string = props.message;
		// @ts-expect-error
		let unexpected = props.unexpected;

		return <div></div>;
	};
	// @ts-expect-error
	elem = <MyFunctionComponent />;
	elem = <MyFunctionComponent message={"message"} />;

	const MyAsyncFunctionComponent: Component<MyProps> = async function (
		this,
		props,
	) {
		const ctx: Context<MyProps> = this;
		let message: string = props.message;
		// @ts-expect-error
		let unexpected = props.unexpected;

		return <div></div>;
	};
	// @ts-expect-error
	elem = <MyAsyncFunctionComponent />;
	elem = <MyAsyncFunctionComponent message={"message"} />;

	const MyGeneratorComponent: Component<MyProps> = function* (
		this,
		initialProps,
	) {
		const ctx: Context<MyProps> = this;
		let message: string = initialProps.message;
		// @ts-expect-error
		let unexpected = initialProps.unexpected;

		for (const newProps of this) {
			let newMessage: string = initialProps.message;
			// @ts-expect-error
			let newUnexpected = newProps.unexpected;
			yield <div></div>;
		}

		return <div></div>;
	};
	// @ts-expect-error
	elem = <MyGeneratorComponent />;
	elem = <MyGeneratorComponent message={"message"} />;

	const MyAsyncGeneratorComponent: Component<MyProps> = async function* (
		this,
		initialProps,
	) {
		const ctx: Context<MyProps> = this;
		let message: string = initialProps.message;
		// @ts-expect-error
		let unexpected = initialProps.unexpected;

		for await (const newProps of this) {
			let newMessage: string = initialProps.message;
			// @ts-expect-error
			let newUnexpected = newProps.unexpected;
			yield <div></div>;
		}

		return <div></div>;
	};
	// @ts-expect-error
	elem = <MyAsyncGeneratorComponent />;
	elem = <MyAsyncGeneratorComponent message={"message"} />;
});

test("FunctionComponent", () => {
	const MyFunctionComponent: Component<MyProps> = function (this, props) {
		const ctx: Context<MyProps> = this;
		let message: string = props.message;
		// @ts-expect-error
		let unexpected = props.unexpected;

		return <div></div>;
	};
	// @ts-expect-error
	elem = <MyFunctionComponent />;
	elem = <MyFunctionComponent message={"message"} />;

	const MyAsyncFunctionComponent: Component<MyProps> = async function (
		this,
		props,
	) {
		const ctx: Context<MyProps> = this;
		let message: string = props.message;
		// @ts-expect-error
		let unexpected = props.unexpected;

		return <div></div>;
	};
	// @ts-expect-error
	elem = <MyAsyncFunctionComponent />;
	elem = <MyAsyncFunctionComponent message={"message"} />;

	const MyAsyncGeneratorComponent: Component<MyProps> = async function* (
		this,
		props,
	) {
		yield <div></div>;
	};
});

test("GeneratorComponent", () => {
	const MyGeneratorComponent: Component<MyProps> = function* (
		this,
		initialProps,
	) {
		const ctx: Context<MyProps> = this;
		let message: string = initialProps.message;
		// @ts-expect-error
		let unexpected = initialProps.unexpected;

		for (const newProps of this) {
			let newMessage: string = initialProps.message;
			// @ts-expect-error
			let newUnexpected = newProps.unexpected;
			yield <div></div>;
		}

		return <div></div>;
	};
	// @ts-expect-error
	elem = <MyGeneratorComponent />;
	elem = <MyGeneratorComponent message={"message"} />;

	const MyAsyncGeneratorComponent: Component<MyProps> = async function* (
		this,
		initialProps,
	) {
		const ctx: Context<MyProps> = this;
		let message: string = initialProps.message;
		// @ts-expect-error
		let unexpected = initialProps.unexpected;

		for await (const newProps of this) {
			let newMessage: string = initialProps.message;
			// @ts-expect-error
			let newUnexpected = newProps.unexpected;
			yield <div></div>;
		}

		return <div></div>;
	};
	// @ts-expect-error
	elem = <MyAsyncGeneratorComponent />;
	elem = <MyAsyncGeneratorComponent message={"message"} />;
});

test("Props inference", () => {
	function* MyComponent(
		this: Context<typeof MyComponent>,
		props: {message: string},
	): unknown {
		for (const props1 of this) {
			// @ts-expect-error
			props1.poop;
			yield props1.message;
		}
	}

	async function* MyAsyncComponent(
		this: Context<typeof MyAsyncComponent>,
		props: {message: string},
	): unknown {
		for await (const props1 of this) {
			// @ts-expect-error
			props1.poop;
			yield props1.message;
		}
	}

	function* FunctionWithNoParameters(
		this: Context<typeof FunctionWithNoParameters>,
	): unknown {
		for ({} of this) {
			// pass
		}

		// @ts-expect-error
		for (const {poop} of this) {
			// pass
		}

		yield "hello";
	}
});

test("loose typings", () => {
	function MyFunctionComponent(props: MyProps) {
		let message: string = props.message;
		// @ts-expect-error
		let unexpected = props.unexpected;

		return <div></div>;
	}

	// @ts-expect-error
	elem = <MyFunctionComponent />;
	elem = <MyFunctionComponent message={"message"} />;

	async function MyAsyncFunctionComponent(props: MyProps) {
		let message: string = props.message;
		// @ts-expect-error
		let unexpected = props.unexpected;

		return <div></div>;
	}

	// @ts-expect-error
	elem = <MyAsyncFunctionComponent />;
	elem = <MyAsyncFunctionComponent message={"message"} />;

	function* MyGeneratorComponent(this: Context, props: MyProps) {
		let message: string = props.message;
		// @ts-expect-error
		let unexpected = props.unexpected;

		for (props of this) {
			let newMessage: string = props.message;
			// @ts-expect-error
			let newUnexpected = props.unexpected;
			yield <div></div>;
		}

		return <div></div>;
	}

	// @ts-expect-error
	elem = <MyGeneratorComponent />;
	elem = <MyGeneratorComponent message={"message"} />;

	async function* MyAsyncGeneratorComponent(this: Context, props: MyProps) {
		let message: string = props.message;
		// @ts-expect-error
		let unexpected = props.unexpected;

		for await (props of this) {
			let newMessage: string = props.message;
			// @ts-expect-error
			let newUnexpected = props.unexpected;
			yield <div></div>;
		}

		return <div></div>;
	}

	// @ts-expect-error
	elem = <MyAsyncGeneratorComponent />;
	elem = <MyAsyncGeneratorComponent message={"message"} />;
});

test.run();
