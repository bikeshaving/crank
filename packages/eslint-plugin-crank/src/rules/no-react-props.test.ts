import {describe, it} from "vitest";
import {noReactProps} from "./no-react-props.js";
import {createTsRuleTester} from "../test-helpers/rule-tester.js";

const ruleTester = createTsRuleTester();

describe("no-react-props", () => {
	it("should allow standard HTML attributes", () => {
		ruleTester.run("no-react-props", noReactProps, {
			valid: [
				{code: `<div class="container">Content</div>`},
				{code: `<label for="input-id">Label</label>`},
				{code: `<div innerHTML={htmlContent} />`},
				{code: `<div id="test" />`},
				{code: `<input type="text" value={val} />`},
				{code: `<div style={{ color: "red" }} />`},
				{code: `<a href="/path">Link</a>`},
			],
			invalid: [],
		});
	});

	describe("className transformation", () => {
		it.each([
			{
				name: "should detect and fix className -> class",
				code: `<div className="container">Content</div>`,
				output: `<div class="container">Content</div>`,
			},
			{
				name: "should fix className with string value",
				code: `<button className="btn btn-primary">Click</button>`,
				output: `<button class="btn btn-primary">Click</button>`,
			},
			{
				name: "should fix className with expression value",
				code: `<div className={styles.container}>Content</div>`,
				output: `<div class={styles.container}>Content</div>`,
			},
			{
				name: "should fix className with template literal",
				code: `<div className={\`container \${active ? 'active' : ''}\`}>Content</div>`,
				output: `<div class={\`container \${active ? 'active' : ''}\`}>Content</div>`,
			},
		])("$name", ({code, output}) => {
			ruleTester.run("no-react-props", noReactProps, {
				valid: [],
				invalid: [
					{
						code,
						output,
						errors: [
							{
								messageId: "useStandardAttribute",
								data: {react: "className", standard: "class"},
							},
						],
					},
				],
			});
		});
	});

	describe("htmlFor transformation", () => {
		it("should detect and fix htmlFor -> for", () => {
			ruleTester.run("no-react-props", noReactProps, {
				valid: [],
				invalid: [
					{
						code: `<label htmlFor="input-id">Label</label>`,
						output: `<label for="input-id">Label</label>`,
						errors: [
							{
								messageId: "useStandardAttribute",
								data: {react: "htmlFor", standard: "for"},
							},
						],
					},
				],
			});
		});

		it("should fix htmlFor with expression value", () => {
			ruleTester.run("no-react-props", noReactProps, {
				valid: [],
				invalid: [
					{
						code: `<label htmlFor={inputId}>Label</label>`,
						output: `<label for={inputId}>Label</label>`,
						errors: [
							{
								messageId: "useStandardAttribute",
								data: {react: "htmlFor", standard: "for"},
							},
						],
					},
				],
			});
		});
	});

	describe("dangerouslySetInnerHTML transformation", () => {
		it("should detect dangerouslySetInnerHTML and suggest innerHTML", () => {
			ruleTester.run("no-react-props", noReactProps, {
				valid: [],
				invalid: [
					{
						code: `<div dangerouslySetInnerHTML={{ __html: htmlContent }} />`,
						output: `<div innerHTML={htmlContent} />`,
						errors: [
							{
								messageId: "useinnerHTML",
							},
						],
					},
				],
			});
		});

		it("should fix dangerouslySetInnerHTML with string literal", () => {
			ruleTester.run("no-react-props", noReactProps, {
				valid: [],
				invalid: [
					{
						code: `<div dangerouslySetInnerHTML={{ __html: "<p>Test</p>" }} />`,
						output: `<div innerHTML={"<p>Test</p>"} />`,
						errors: [
							{
								messageId: "useinnerHTML",
							},
						],
					},
				],
			});
		});

		it("should fix dangerouslySetInnerHTML with variable", () => {
			ruleTester.run("no-react-props", noReactProps, {
				valid: [],
				invalid: [
					{
						code: `<div dangerouslySetInnerHTML={{ __html: markup }} />`,
						output: `<div innerHTML={markup} />`,
						errors: [
							{
								messageId: "useinnerHTML",
							},
						],
					},
				],
			});
		});

		it("should fix dangerouslySetInnerHTML with complex expression", () => {
			ruleTester.run("no-react-props", noReactProps, {
				valid: [],
				invalid: [
					{
						code: `<div dangerouslySetInnerHTML={{ __html: getMarkup() }} />`,
						output: `<div innerHTML={getMarkup()} />`,
						errors: [
							{
								messageId: "useinnerHTML",
							},
						],
					},
				],
			});
		});

		it("should fix dangerouslySetInnerHTML with template literal", () => {
			ruleTester.run("no-react-props", noReactProps, {
				valid: [],
				invalid: [
					{
						code: `<div dangerouslySetInnerHTML={{ __html: \`<p>\${text}</p>\` }} />`,
						output: `<div innerHTML={\`<p>\${text}</p>\`} />`,
						errors: [
							{
								messageId: "useinnerHTML",
							},
						],
					},
				],
			});
		});
	});

	describe("multiple React props", () => {
		it("should fix multiple React props in one component", () => {
			ruleTester.run("no-react-props", noReactProps, {
				valid: [],
				invalid: [
					{
						code: `<div className="container" htmlFor="test">Content</div>`,
						output: `<div class="container" for="test">Content</div>`,
						errors: [
							{
								messageId: "useStandardAttribute",
								data: {react: "className", standard: "class"},
							},
							{
								messageId: "useStandardAttribute",
								data: {react: "htmlFor", standard: "for"},
							},
						],
					},
				],
			});
		});

		it("should fix React props mixed with standard attributes", () => {
			ruleTester.run("no-react-props", noReactProps, {
				valid: [],
				invalid: [
					{
						code: `
              <div
                id="container"
                className="main-content"
                data-test="true"
              >
                Content
              </div>
            `,
						output: `
              <div
                id="container"
                class="main-content"
                data-test="true"
              >
                Content
              </div>
            `,
						errors: [
							{
								messageId: "useStandardAttribute",
								data: {react: "className", standard: "class"},
							},
						],
					},
				],
			});
		});
	});

	describe("real-world scenarios", () => {
		it("should handle form with label and input", () => {
			ruleTester.run("no-react-props", noReactProps, {
				valid: [],
				invalid: [
					{
						code: `
              <form className="login-form">
                <label htmlFor="username">Username</label>
                <input id="username" className="form-input" />
              </form>
            `,
						output: `
              <form class="login-form">
                <label for="username">Username</label>
                <input id="username" class="form-input" />
              </form>
            `,
						errors: [
							{
								messageId: "useStandardAttribute",
								data: {react: "className", standard: "class"},
							},
							{
								messageId: "useStandardAttribute",
								data: {react: "htmlFor", standard: "for"},
							},
							{
								messageId: "useStandardAttribute",
								data: {react: "className", standard: "class"},
							},
						],
					},
				],
			});
		});

		it("should work in Crank generator components", () => {
			ruleTester.run("no-react-props", noReactProps, {
				valid: [],
				invalid: [
					{
						code: `
              function* Component() {
                yield <div className="container">Content</div>;
              }
            `,
						output: `
              function* Component() {
                yield <div class="container">Content</div>;
              }
            `,
						errors: [
							{
								messageId: "useStandardAttribute",
								data: {react: "className", standard: "class"},
							},
						],
					},
				],
			});
		});

		it("should handle nested components with React props", () => {
			ruleTester.run("no-react-props", noReactProps, {
				valid: [],
				invalid: [
					{
						code: `
              <div className="outer">
                <div className="inner">
                  <span className="text">Hello</span>
                </div>
              </div>
            `,
						output: `
              <div class="outer">
                <div class="inner">
                  <span class="text">Hello</span>
                </div>
              </div>
            `,
						errors: [
							{
								messageId: "useStandardAttribute",
								data: {react: "className", standard: "class"},
							},
							{
								messageId: "useStandardAttribute",
								data: {react: "className", standard: "class"},
							},
							{
								messageId: "useStandardAttribute",
								data: {react: "className", standard: "class"},
							},
						],
					},
				],
			});
		});
	});
});
