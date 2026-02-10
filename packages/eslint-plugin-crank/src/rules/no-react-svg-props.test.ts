import {describe, it} from "vitest";
import {noReactSvgProps} from "./no-react-svg-props.js";
import {createTsRuleTester} from "../test-helpers/rule-tester.js";

const ruleTester = createTsRuleTester();

describe("no-react-svg-props", () => {
	it("should allow kebab-case SVG attributes", () => {
		ruleTester.run("no-react-svg-props", noReactSvgProps, {
			valid: [
				{
					code: `
            <svg viewBox="0 0 100 100">
              <path stroke-width="2" fill-opacity="0.5" />
            </svg>
          `,
				},
				{
					code: `
            <svg>
              <circle stroke-dasharray="5,5" stroke-linecap="round" />
            </svg>
          `,
				},
				{
					code: `
            <svg>
              <text text-anchor="middle" font-family="Arial" />
            </svg>
          `,
				},
				{
					code: `
            <svg>
              <rect clip-path="url(#clip)" />
            </svg>
          `,
				},
			],
			invalid: [],
		});
	});

	it("should not flag camelCase attributes in non-SVG elements", () => {
		ruleTester.run("no-react-svg-props", noReactSvgProps, {
			valid: [
				{
					code: `<div strokeWidth="2">Not SVG</div>`,
				},
				{
					code: `<button fillOpacity="0.5">Not SVG</button>`,
				},
				{
					code: `<Component strokeDasharray="5,5" />`,
				},
			],
			invalid: [],
		});
	});

	describe("stroke attributes", () => {
		it.each([
			{
				camelCase: "strokeWidth",
				kebabCase: "stroke-width",
				element: "path",
				value: "2",
			},
			{
				camelCase: "strokeDasharray",
				kebabCase: "stroke-dasharray",
				element: "line",
				value: "5,5",
			},
			{
				camelCase: "strokeLinecap",
				kebabCase: "stroke-linecap",
				element: "path",
				value: "round",
			},
			{
				camelCase: "strokeLinejoin",
				kebabCase: "stroke-linejoin",
				element: "polygon",
				value: "miter",
			},
			{
				camelCase: "strokeOpacity",
				kebabCase: "stroke-opacity",
				element: "circle",
				value: "0.5",
			},
		])(
			"should detect and fix $camelCase",
			({camelCase, kebabCase, element, value}) => {
				ruleTester.run("no-react-svg-props", noReactSvgProps, {
					valid: [],
					invalid: [
						{
							code: `
              <svg>
                <${element} ${camelCase}="${value}" />
              </svg>
            `,
							output: `
              <svg>
                <${element} ${kebabCase}="${value}" />
              </svg>
            `,
							errors: [
								{
									messageId: "noReactSvgProp",
									data: {camelCase, kebabCase},
								},
							],
						},
					],
				});
			},
		);
	});

	describe("fill attributes", () => {
		it.each([
			{
				camelCase: "fillOpacity",
				kebabCase: "fill-opacity",
				element: "rect",
				value: "0.7",
			},
			{
				camelCase: "fillRule",
				kebabCase: "fill-rule",
				element: "path",
				value: "evenodd",
			},
		])(
			"should detect and fix $camelCase",
			({camelCase, kebabCase, element, value}) => {
				ruleTester.run("no-react-svg-props", noReactSvgProps, {
					valid: [],
					invalid: [
						{
							code: `
              <svg>
                <${element} ${camelCase}="${value}" />
              </svg>
            `,
							output: `
              <svg>
                <${element} ${kebabCase}="${value}" />
              </svg>
            `,
							errors: [
								{
									messageId: "noReactSvgProp",
									data: {camelCase, kebabCase},
								},
							],
						},
					],
				});
			},
		);
	});

	describe("text attributes", () => {
		it.each([
			{
				camelCase: "textAnchor",
				kebabCase: "text-anchor",
				value: "middle",
				content: "Text",
			},
			{
				camelCase: "fontFamily",
				kebabCase: "font-family",
				value: "Arial",
				content: "Text",
			},
			{
				camelCase: "fontSize",
				kebabCase: "font-size",
				value: "16",
				content: "Text",
			},
			{
				camelCase: "fontWeight",
				kebabCase: "font-weight",
				value: "bold",
				content: "Text",
			},
		])(
			"should detect and fix $camelCase",
			({camelCase, kebabCase, value, content}) => {
				ruleTester.run("no-react-svg-props", noReactSvgProps, {
					valid: [],
					invalid: [
						{
							code: `
              <svg>
                <text ${camelCase}="${value}">${content}</text>
              </svg>
            `,
							output: `
              <svg>
                <text ${kebabCase}="${value}">${content}</text>
              </svg>
            `,
							errors: [
								{
									messageId: "noReactSvgProp",
									data: {camelCase, kebabCase},
								},
							],
						},
					],
				});
			},
		);
	});

	describe("clip and mask attributes", () => {
		it("should detect and fix clipPath", () => {
			ruleTester.run("no-react-svg-props", noReactSvgProps, {
				valid: [],
				invalid: [
					{
						code: `
              <svg>
                <rect clipPath="url(#clip)" />
              </svg>
            `,
						output: `
              <svg>
                <rect clip-path="url(#clip)" />
              </svg>
            `,
						errors: [
							{
								messageId: "noReactSvgProp",
								data: {camelCase: "clipPath", kebabCase: "clip-path"},
							},
						],
					},
				],
			});
		});

		it("should detect and fix clipRule", () => {
			ruleTester.run("no-react-svg-props", noReactSvgProps, {
				valid: [],
				invalid: [
					{
						code: `
              <svg>
                <path clipRule="evenodd" />
              </svg>
            `,
						output: `
              <svg>
                <path clip-rule="evenodd" />
              </svg>
            `,
						errors: [
							{
								messageId: "noReactSvgProp",
								data: {camelCase: "clipRule", kebabCase: "clip-rule"},
							},
						],
					},
				],
			});
		});
	});

	describe("multiple attributes", () => {
		it("should fix multiple camelCase attributes in one element", () => {
			ruleTester.run("no-react-svg-props", noReactSvgProps, {
				valid: [],
				invalid: [
					{
						code: `
              <svg>
                <path strokeWidth="2" fillOpacity="0.5" strokeDasharray="5,5" />
              </svg>
            `,
						output: `
              <svg>
                <path stroke-width="2" fill-opacity="0.5" stroke-dasharray="5,5" />
              </svg>
            `,
						errors: [
							{
								messageId: "noReactSvgProp",
								data: {camelCase: "strokeWidth", kebabCase: "stroke-width"},
							},
							{
								messageId: "noReactSvgProp",
								data: {camelCase: "fillOpacity", kebabCase: "fill-opacity"},
							},
							{
								messageId: "noReactSvgProp",
								data: {
									camelCase: "strokeDasharray",
									kebabCase: "stroke-dasharray",
								},
							},
						],
					},
				],
			});
		});
	});

	describe("nested SVG elements", () => {
		it("should detect camelCase attributes in nested SVG elements", () => {
			ruleTester.run("no-react-svg-props", noReactSvgProps, {
				valid: [],
				invalid: [
					{
						code: `
              <svg viewBox="0 0 100 100">
                <g>
                  <circle strokeWidth="2" />
                  <rect fillOpacity="0.5" />
                </g>
              </svg>
            `,
						output: `
              <svg viewBox="0 0 100 100">
                <g>
                  <circle stroke-width="2" />
                  <rect fill-opacity="0.5" />
                </g>
              </svg>
            `,
						errors: [
							{
								messageId: "noReactSvgProp",
								data: {camelCase: "strokeWidth", kebabCase: "stroke-width"},
							},
							{
								messageId: "noReactSvgProp",
								data: {camelCase: "fillOpacity", kebabCase: "fill-opacity"},
							},
						],
					},
				],
			});
		});
	});

	describe("real-world SVG examples", () => {
		it("should handle icon components", () => {
			ruleTester.run("no-react-svg-props", noReactSvgProps, {
				valid: [],
				invalid: [
					{
						code: `
              function* Icon() {
                yield (
                  <svg viewBox="0 0 24 24">
                    <path
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fillOpacity="0"
                      d="M12 2L2 7l10 5 10-5-10-5z"
                    />
                  </svg>
                );
              }
            `,
						output: `
              function* Icon() {
                yield (
                  <svg viewBox="0 0 24 24">
                    <path
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      fill-opacity="0"
                      d="M12 2L2 7l10 5 10-5-10-5z"
                    />
                  </svg>
                );
              }
            `,
						errors: [
							{
								messageId: "noReactSvgProp",
								data: {camelCase: "strokeWidth", kebabCase: "stroke-width"},
							},
							{
								messageId: "noReactSvgProp",
								data: {
									camelCase: "strokeLinecap",
									kebabCase: "stroke-linecap",
								},
							},
							{
								messageId: "noReactSvgProp",
								data: {
									camelCase: "strokeLinejoin",
									kebabCase: "stroke-linejoin",
								},
							},
							{
								messageId: "noReactSvgProp",
								data: {camelCase: "fillOpacity", kebabCase: "fill-opacity"},
							},
						],
					},
				],
			});
		});

		it("should handle complex SVG charts", () => {
			ruleTester.run("no-react-svg-props", noReactSvgProps, {
				valid: [],
				invalid: [
					{
						code: `
              <svg viewBox="0 0 400 300">
                <text textAnchor="middle" fontFamily="sans-serif" fontSize="14">
                  Chart Title
                </text>
                <line strokeWidth="1" strokeDasharray="2,2" />
              </svg>
            `,
						output: `
              <svg viewBox="0 0 400 300">
                <text text-anchor="middle" font-family="sans-serif" font-size="14">
                  Chart Title
                </text>
                <line stroke-width="1" stroke-dasharray="2,2" />
              </svg>
            `,
						errors: [
							{
								messageId: "noReactSvgProp",
								data: {camelCase: "textAnchor", kebabCase: "text-anchor"},
							},
							{
								messageId: "noReactSvgProp",
								data: {camelCase: "fontFamily", kebabCase: "font-family"},
							},
							{
								messageId: "noReactSvgProp",
								data: {camelCase: "fontSize", kebabCase: "font-size"},
							},
							{
								messageId: "noReactSvgProp",
								data: {camelCase: "strokeWidth", kebabCase: "stroke-width"},
							},
							{
								messageId: "noReactSvgProp",
								data: {
									camelCase: "strokeDasharray",
									kebabCase: "stroke-dasharray",
								},
							},
						],
					},
				],
			});
		});
	});

	describe("color and gradient attributes", () => {
		it("should detect and fix stopColor and stopOpacity", () => {
			ruleTester.run("no-react-svg-props", noReactSvgProps, {
				valid: [],
				invalid: [
					{
						code: `
              <svg>
                <linearGradient>
                  <stop offset="0%" stopColor="red" stopOpacity="1" />
                  <stop offset="100%" stopColor="blue" stopOpacity="0.5" />
                </linearGradient>
              </svg>
            `,
						output: `
              <svg>
                <linearGradient>
                  <stop offset="0%" stop-color="red" stop-opacity="1" />
                  <stop offset="100%" stop-color="blue" stop-opacity="0.5" />
                </linearGradient>
              </svg>
            `,
						errors: [
							{
								messageId: "noReactSvgProp",
								data: {camelCase: "stopColor", kebabCase: "stop-color"},
							},
							{
								messageId: "noReactSvgProp",
								data: {camelCase: "stopOpacity", kebabCase: "stop-opacity"},
							},
							{
								messageId: "noReactSvgProp",
								data: {camelCase: "stopColor", kebabCase: "stop-color"},
							},
							{
								messageId: "noReactSvgProp",
								data: {camelCase: "stopOpacity", kebabCase: "stop-opacity"},
							},
						],
					},
				],
			});
		});
	});
});
