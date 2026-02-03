import {describe, test, expect} from "bun:test";
import {jsxToTemplate} from "./jsx-to-template.js";
import {templateToJSX} from "./template-to-jsx.js";

describe("jsxToTemplate", () => {
	test("converts simple HTML element", () => {
		const input = `<div>Hello</div>`;
		const output = jsxToTemplate(input);
		expect(output).toContain("jsx`<div>Hello</div>`");
	});

	test("converts element with expression", () => {
		const input = `<div>Hello {name}</div>`;
		const output = jsxToTemplate(input);
		expect(output).toContain("jsx`<div>Hello ${name}</div>`");
	});

	test("converts component with dynamic tag", () => {
		const input = `<Counter count={0} />`;
		const output = jsxToTemplate(input);
		expect(output).toContain("jsx`<${Counter} count=${0} />`");
	});

	test("converts fragment", () => {
		const input = `<><div>A</div><div>B</div></>`;
		const output = jsxToTemplate(input);
		expect(output).toContain("jsx`<><div>A</div><div>B</div><//>`");
	});

	test("converts spread props", () => {
		const input = `<div {...props} />`;
		const output = jsxToTemplate(input);
		expect(output).toContain("jsx`<div ...${props} />`");
	});

	test("converts member expression tag", () => {
		const input = `<Foo.Bar />`;
		const output = jsxToTemplate(input);
		expect(output).toContain("jsx`<${Foo.Bar} />`");
	});

	test("converts nested JSX in expressions", () => {
		const input = `<Suspense fallback={<div>Loading...</div>}><Child /></Suspense>`;
		const output = jsxToTemplate(input);
		// Nested JSX should be wrapped in its own jsx`` template
		expect(output).toContain("fallback=${jsx`<div>Loading...</div>`}");
	});

	test("converts nested JSX in children", () => {
		const input = `<div>{condition && <span>Hello</span>}</div>`;
		const output = jsxToTemplate(input);
		// Regular expression with JSX should have nested JSX wrapped
		expect(output).toContain("${condition && jsx`<span>Hello</span>`}");
	});
});

describe("templateToJSX", () => {
	test("converts simple HTML element", () => {
		const input = `jsx\`<div>Hello</div>\``;
		const output = templateToJSX(input);
		expect(output).toContain("<div>Hello</div>");
	});

	test("converts element with expression", () => {
		const input = `jsx\`<div>Hello \${name}</div>\``;
		const output = templateToJSX(input);
		expect(output).toContain("<div>Hello {name}</div>");
	});

	test("converts component with dynamic tag", () => {
		const input = `jsx\`<\${Counter} count=\${0} />\``;
		const output = templateToJSX(input);
		expect(output).toContain("<Counter count={0} />");
	});

	test("converts fragment", () => {
		const input = `jsx\`<><div>A</div><div>B</div><//>\``;
		const output = templateToJSX(input);
		expect(output).toContain("<><div>A</div><div>B</div></>");
	});

	test("converts spread props", () => {
		const input = `jsx\`<div ...\${props} />\``;
		const output = templateToJSX(input);
		expect(output).toContain("<div {...props} />");
	});

	test("converts member expression tag", () => {
		const input = `jsx\`<\${Foo.Bar} />\``;
		const output = templateToJSX(input);
		expect(output).toContain("<Foo.Bar />");
	});
});

describe("roundtrip", () => {
	test("JSX -> template -> JSX preserves structure", () => {
		const original = `<div class="test">Hello {name}</div>`;
		const template = jsxToTemplate(original);
		const back = templateToJSX(template);
		expect(back).toContain('<div class="test">Hello {name}</div>');
	});

	test("handles nested components", () => {
		const original = `<Parent><Child value={x} /></Parent>`;
		const template = jsxToTemplate(original);
		expect(template).toContain("jsx`<${Parent}><${Child} value=${x} /><//>`");
		const back = templateToJSX(template);
		expect(back).toContain("<Parent><Child value={x} /></Parent>");
	});
});
