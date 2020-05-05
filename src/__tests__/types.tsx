/** @jsx createElement */
/* eslint @typescript-eslint/no-unused-vars: "off", jest/expect-expect: "off" */
import {
	createElement,
	Component,
	FunctionComponent,
	Context,
	GeneratorComponent,
} from "..";

describe("types", () => {
	type MyProps = {
		message: string;
	};
	let elem: any;

	test("Not Components", () => {
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

	test("Components", () => {
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

	test("Function Components", () => {
		const MyFunctionComponent: FunctionComponent<MyProps> = function (
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
		elem = <MyFunctionComponent />;
		elem = <MyFunctionComponent message={"message"} />;

		const MyAsyncFunctionComponent: FunctionComponent<MyProps> = async function (
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

		// @ts-expect-error
		const MyGeneratorComponent: FunctionComponent<MyProps> = function* (
			this,
			props,
		) {
			yield <div></div>;
		};
		// @ts-expect-error
		const MyAsyncGeneratorComponent: FunctionComponent<MyProps> = async function* (
			this,
			props,
		) {
			yield <div></div>;
		};
	});

	test("Generator Components", () => {
		const MyGeneratorComponent: GeneratorComponent<MyProps> = function* (
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

		const MyAsyncGeneratorComponent: GeneratorComponent<MyProps> = async function* (
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

		// TODO: add ts-expect-error at some point in the future, I guess?
		// This will not pass because the function is infered as any, and any matches Iterator<any, any, any>.
		// Hopefully a later typescript version fixes this :(
		const MyFunctionComponent: GeneratorComponent<MyProps> = function (
			this,
			props,
		) {
			return <div></div>;
		};
		// @ts-expect-error
		const MyAsyncFunctionComponent: GeneratorComponent<MyProps> = async function (
			this,
			props,
		) {
			return <div></div>;
		};
	});

	test("Loose Typings", () => {
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
});
