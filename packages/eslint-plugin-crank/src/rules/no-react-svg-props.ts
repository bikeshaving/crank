import {Rule} from "eslint";
import {ESLintNode} from "../utils/types.js";
import {createConditionalJSXAttributeMapper} from "../utils/jsx-utils.js";

// React SVG camelCase → standard SVG attribute mapping.
// Only includes entries where the React name differs from the SVG attribute name.
// Canonical source: https://github.com/facebook/react/blob/main/packages/react-dom-bindings/src/shared/possibleStandardNames.js
const SVG_ATTRIBUTE_MAPPINGS: Record<string, string> = {
	accentHeight: "accent-height",
	alignmentBaseline: "alignment-baseline",
	arabicForm: "arabic-form",
	baselineShift: "baseline-shift",
	capHeight: "cap-height",
	clipPath: "clip-path",
	clipRule: "clip-rule",
	colorInterpolation: "color-interpolation",
	colorInterpolationFilters: "color-interpolation-filters",
	colorProfile: "color-profile",
	colorRendering: "color-rendering",
	dominantBaseline: "dominant-baseline",
	enableBackground: "enable-background",
	fillOpacity: "fill-opacity",
	fillRule: "fill-rule",
	floodColor: "flood-color",
	floodOpacity: "flood-opacity",
	fontFamily: "font-family",
	fontSize: "font-size",
	fontSizeAdjust: "font-size-adjust",
	fontStretch: "font-stretch",
	fontStyle: "font-style",
	fontVariant: "font-variant",
	fontWeight: "font-weight",
	glyphName: "glyph-name",
	glyphOrientationHorizontal: "glyph-orientation-horizontal",
	glyphOrientationVertical: "glyph-orientation-vertical",
	horizAdvX: "horiz-adv-x",
	horizOriginX: "horiz-origin-x",
	imageRendering: "image-rendering",
	letterSpacing: "letter-spacing",
	lightingColor: "lighting-color",
	markerEnd: "marker-end",
	markerMid: "marker-mid",
	markerStart: "marker-start",
	overlinePosition: "overline-position",
	overlineThickness: "overline-thickness",
	paintOrder: "paint-order",
	pointerEvents: "pointer-events",
	renderingIntent: "rendering-intent",
	shapeRendering: "shape-rendering",
	stopColor: "stop-color",
	stopOpacity: "stop-opacity",
	strikethroughPosition: "strikethrough-position",
	strikethroughThickness: "strikethrough-thickness",
	strokeDasharray: "stroke-dasharray",
	strokeDashoffset: "stroke-dashoffset",
	strokeLinecap: "stroke-linecap",
	strokeLinejoin: "stroke-linejoin",
	strokeMiterlimit: "stroke-miterlimit",
	strokeOpacity: "stroke-opacity",
	strokeWidth: "stroke-width",
	textAnchor: "text-anchor",
	textDecoration: "text-decoration",
	textRendering: "text-rendering",
	transformOrigin: "transform-origin",
	underlinePosition: "underline-position",
	underlineThickness: "underline-thickness",
	unicodeBidi: "unicode-bidi",
	unicodeRange: "unicode-range",
	unitsPerEm: "units-per-em",
	vAlphabetic: "v-alphabetic",
	vHanging: "v-hanging",
	vIdeographic: "v-ideographic",
	vMathematical: "v-mathematical",
	vectorEffect: "vector-effect",
	vertAdvY: "vert-adv-y",
	vertOriginX: "vert-origin-x",
	vertOriginY: "vert-origin-y",
	wordSpacing: "word-spacing",
	writingMode: "writing-mode",
	xHeight: "x-height",
	// xlink/xml namespace attributes (deprecated in SVG 2 but still used)
	xlinkActuate: "xlink:actuate",
	xlinkArcrole: "xlink:arcrole",
	xlinkHref: "xlink:href",
	xlinkRole: "xlink:role",
	xlinkShow: "xlink:show",
	xlinkTitle: "xlink:title",
	xlinkType: "xlink:type",
	xmlBase: "xml:base",
	xmlLang: "xml:lang",
	xmlSpace: "xml:space",
	xmlnsXlink: "xmlns:xlink",
};

// SVG element names to help identify SVG context
const SVG_ELEMENTS = new Set([
	"svg",
	"g",
	"path",
	"circle",
	"rect",
	"line",
	"polyline",
	"polygon",
	"ellipse",
	"text",
	"tspan",
	"defs",
	"clipPath",
	"linearGradient",
	"radialGradient",
	"stop",
	"mask",
	"pattern",
	"image",
	"use",
	"symbol",
	"marker",
	"feBlend",
	"feColorMatrix",
	"feComponentTransfer",
	"feComposite",
	"feConvolveMatrix",
	"feDiffuseLighting",
	"feDisplacementMap",
	"feDistantLight",
	"feFlood",
	"feFuncA",
	"feFuncB",
	"feFuncG",
	"feFuncR",
	"feGaussianBlur",
	"feImage",
	"feMerge",
	"feMergeNode",
	"feMorphology",
	"feOffset",
	"fePointLight",
	"feSpecularLighting",
	"feSpotLight",
	"feTile",
	"feTurbulence",
	"filter",
	"foreignObject",
	"animate",
	"animateMotion",
	"animateTransform",
	"set",
]);

function isSVGElement(node: ESLintNode): boolean {
	let current = node.parent;

	while (current) {
		if (
			current.type === "JSXElement" &&
			current.openingElement?.name?.type === "JSXIdentifier"
		) {
			if (SVG_ELEMENTS.has(current.openingElement.name.name)) {
				return true;
			}
		}
		current = current.parent;
	}

	return false;
}

export const noReactSvgProps: Rule.RuleModule = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Detect React-style SVG attributes and suggest standard SVG equivalents",
			category: "Best Practices",
			recommended: true,
		},
		fixable: "code",
		schema: [],
		messages: {
			noReactSvgProp:
				"Use '{{standard}}' instead of '{{react}}' - Crank uses standard SVG attribute names, not React's camelCase",
		},
	},

	create(context) {
		const handleSVGMapping = createConditionalJSXAttributeMapper(
			SVG_ATTRIBUTE_MAPPINGS,
			"noReactSvgProp",
			{from: "react", to: "standard"},
			isSVGElement,
		);

		return {
			JSXAttribute(node: ESLintNode) {
				handleSVGMapping(node, context);
			},
		};
	},
};
