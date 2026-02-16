import {describe, it} from "vitest";
import {noReactSvgProps} from "./no-react-svg-props.js";
import {createTsRuleTester} from "../test-helpers/rule-tester.js";

const ruleTester = createTsRuleTester();

describe("no-react-svg-props", () => {
	it("detects React camelCase SVG attributes and fixes to standard names", () => {
		ruleTester.run("no-react-svg-props", noReactSvgProps, {
			valid: [
				// kebab-case SVG attributes should be allowed
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
				// camelCase attributes in non-SVG elements should not be flagged
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
			invalid: [
				// stroke attributes
				{
					code: `<svg><path strokeWidth="2" /></svg>`,
					output: `<svg><path stroke-width="2" /></svg>`,
					errors: [
						{
							messageId: "noReactSvgProp",
							data: {react: "strokeWidth", standard: "stroke-width"},
						},
					],
				},
				{
					code: `<svg><line strokeDasharray="5,5" /></svg>`,
					output: `<svg><line stroke-dasharray="5,5" /></svg>`,
					errors: [
						{
							messageId: "noReactSvgProp",
							data: {react: "strokeDasharray", standard: "stroke-dasharray"},
						},
					],
				},
				{
					code: `<svg><path strokeLinecap="round" /></svg>`,
					output: `<svg><path stroke-linecap="round" /></svg>`,
					errors: [
						{
							messageId: "noReactSvgProp",
							data: {react: "strokeLinecap", standard: "stroke-linecap"},
						},
					],
				},
				{
					code: `<svg><polygon strokeLinejoin="miter" /></svg>`,
					output: `<svg><polygon stroke-linejoin="miter" /></svg>`,
					errors: [
						{
							messageId: "noReactSvgProp",
							data: {react: "strokeLinejoin", standard: "stroke-linejoin"},
						},
					],
				},
				{
					code: `<svg><circle strokeOpacity="0.5" /></svg>`,
					output: `<svg><circle stroke-opacity="0.5" /></svg>`,
					errors: [
						{
							messageId: "noReactSvgProp",
							data: {react: "strokeOpacity", standard: "stroke-opacity"},
						},
					],
				},
				// fill attributes
				{
					code: `<svg><rect fillOpacity="0.7" /></svg>`,
					output: `<svg><rect fill-opacity="0.7" /></svg>`,
					errors: [
						{
							messageId: "noReactSvgProp",
							data: {react: "fillOpacity", standard: "fill-opacity"},
						},
					],
				},
				{
					code: `<svg><path fillRule="evenodd" /></svg>`,
					output: `<svg><path fill-rule="evenodd" /></svg>`,
					errors: [
						{
							messageId: "noReactSvgProp",
							data: {react: "fillRule", standard: "fill-rule"},
						},
					],
				},
				// text attributes
				{
					code: `<svg><text textAnchor="middle">Text</text></svg>`,
					output: `<svg><text text-anchor="middle">Text</text></svg>`,
					errors: [
						{
							messageId: "noReactSvgProp",
							data: {react: "textAnchor", standard: "text-anchor"},
						},
					],
				},
				{
					code: `<svg><text fontFamily="Arial">Text</text></svg>`,
					output: `<svg><text font-family="Arial">Text</text></svg>`,
					errors: [
						{
							messageId: "noReactSvgProp",
							data: {react: "fontFamily", standard: "font-family"},
						},
					],
				},
				{
					code: `<svg><text fontSize="16">Text</text></svg>`,
					output: `<svg><text font-size="16">Text</text></svg>`,
					errors: [
						{
							messageId: "noReactSvgProp",
							data: {react: "fontSize", standard: "font-size"},
						},
					],
				},
				{
					code: `<svg><text fontWeight="bold">Text</text></svg>`,
					output: `<svg><text font-weight="bold">Text</text></svg>`,
					errors: [
						{
							messageId: "noReactSvgProp",
							data: {react: "fontWeight", standard: "font-weight"},
						},
					],
				},
				// clip attributes
				{
					code: `<svg><rect clipPath="url(#clip)" /></svg>`,
					output: `<svg><rect clip-path="url(#clip)" /></svg>`,
					errors: [
						{
							messageId: "noReactSvgProp",
							data: {react: "clipPath", standard: "clip-path"},
						},
					],
				},
				{
					code: `<svg><path clipRule="evenodd" /></svg>`,
					output: `<svg><path clip-rule="evenodd" /></svg>`,
					errors: [
						{
							messageId: "noReactSvgProp",
							data: {react: "clipRule", standard: "clip-rule"},
						},
					],
				},
				// multiple attributes
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
							data: {react: "strokeWidth", standard: "stroke-width"},
						},
						{
							messageId: "noReactSvgProp",
							data: {react: "fillOpacity", standard: "fill-opacity"},
						},
						{
							messageId: "noReactSvgProp",
							data: {react: "strokeDasharray", standard: "stroke-dasharray"},
						},
					],
				},
				// nested SVG elements
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
							data: {react: "strokeWidth", standard: "stroke-width"},
						},
						{
							messageId: "noReactSvgProp",
							data: {react: "fillOpacity", standard: "fill-opacity"},
						},
					],
				},
				// icon component
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
							data: {react: "strokeWidth", standard: "stroke-width"},
						},
						{
							messageId: "noReactSvgProp",
							data: {react: "strokeLinecap", standard: "stroke-linecap"},
						},
						{
							messageId: "noReactSvgProp",
							data: {react: "strokeLinejoin", standard: "stroke-linejoin"},
						},
						{
							messageId: "noReactSvgProp",
							data: {react: "fillOpacity", standard: "fill-opacity"},
						},
					],
				},
				// chart with text and lines
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
							data: {react: "textAnchor", standard: "text-anchor"},
						},
						{
							messageId: "noReactSvgProp",
							data: {react: "fontFamily", standard: "font-family"},
						},
						{
							messageId: "noReactSvgProp",
							data: {react: "fontSize", standard: "font-size"},
						},
						{
							messageId: "noReactSvgProp",
							data: {react: "strokeWidth", standard: "stroke-width"},
						},
						{
							messageId: "noReactSvgProp",
							data: {react: "strokeDasharray", standard: "stroke-dasharray"},
						},
					],
				},
				// gradient stop-color and stop-opacity
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
							data: {react: "stopColor", standard: "stop-color"},
						},
						{
							messageId: "noReactSvgProp",
							data: {react: "stopOpacity", standard: "stop-opacity"},
						},
						{
							messageId: "noReactSvgProp",
							data: {react: "stopColor", standard: "stop-color"},
						},
						{
							messageId: "noReactSvgProp",
							data: {react: "stopOpacity", standard: "stop-opacity"},
						},
					],
				},
			],
		});
	});
});
