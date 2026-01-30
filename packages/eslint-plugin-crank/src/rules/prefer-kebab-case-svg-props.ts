import { Rule } from "eslint";
import { ESLintNode } from "../utils/types.js";
import { createConditionalJSXAttributeMapper } from "../utils/jsx-utils.js";

// Common SVG attributes that React uses in camelCase but should be kebab-case in standard SVG/Crank
const SVG_ATTRIBUTE_MAPPINGS: Record<string, string> = {
  // Presentation attributes
  clipPath: "clip-path",
  clipRule: "clip-rule",
  colorInterpolation: "color-interpolation",
  colorInterpolationFilters: "color-interpolation-filters",
  colorRendering: "color-rendering",
  dominantBaseline: "dominant-baseline",
  fillOpacity: "fill-opacity",
  fillRule: "fill-rule",
  floodColor: "flood-color",
  floodOpacity: "flood-opacity",
  fontFamily: "font-family",
  fontSize: "font-size",
  fontStretch: "font-stretch",
  fontStyle: "font-style",
  fontVariant: "font-variant",
  fontWeight: "font-weight",
  glyphOrientationHorizontal: "glyph-orientation-horizontal",
  glyphOrientationVertical: "glyph-orientation-vertical",
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
  underlinePosition: "underline-position",
  underlineThickness: "underline-thickness",
  vectorEffect: "vector-effect",
  wordSpacing: "word-spacing",
  writingMode: "writing-mode",

  // Filter attributes
  baseFrequency: "baseFrequency",
  diffuseConstant: "diffuseConstant",
  kernelMatrix: "kernelMatrix",
  kernelUnitLength: "kernelUnitLength",
  numOctaves: "numOctaves",
  specularConstant: "specularConstant",
  specularExponent: "specularExponent",
  stdDeviation: "stdDeviation",
  surfaceScale: "surfaceScale",

  // Animation attributes
  attributeName: "attributeName",
  attributeType: "attributeType",
  calcMode: "calcMode",
  keyPoints: "keyPoints",
  keySplines: "keySplines",
  keyTimes: "keyTimes",
  repeatCount: "repeatCount",
  repeatDur: "repeatDur",

  // Other
  alignmentBaseline: "alignment-baseline",
  baselineShift: "baseline-shift",
  clipPathUnits: "clipPathUnits",
  contentScriptType: "contentScriptType",
  contentStyleType: "contentStyleType",
  enableBackground: "enable-background",
  gradientTransform: "gradientTransform",
  gradientUnits: "gradientUnits",
  maskContentUnits: "maskContentUnits",
  maskUnits: "maskUnits",
  patternContentUnits: "patternContentUnits",
  patternTransform: "patternTransform",
  patternUnits: "patternUnits",
  preserveAspectRatio: "preserveAspectRatio",
  spreadMethod: "spreadMethod",
  startOffset: "startOffset",
  textLength: "textLength",
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
    if (current.type === "JSXElement" && current.openingElement?.name?.type === "JSXIdentifier") {
      if (SVG_ELEMENTS.has(current.openingElement.name.name)) {
        return true;
      }
    }
    current = current.parent;
  }

  return false;
}

export const preferKebabCaseSvgProps: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Warn against camelCase SVG attributes (React style) and suggest kebab-case equivalents",
      category: "Best Practices",
      recommended: false,
    },
    fixable: "code",
    schema: [],
    messages: {
      preferKebabCase:
        "SVG attribute '{{camelCase}}' should be '{{kebabCase}}' - Crank uses standard SVG attribute names, not React's camelCase",
    },
  },

  create(context) {
    // Create the conditional mapper for SVG attribute replacements
    const handleSVGMapping = createConditionalJSXAttributeMapper(
      SVG_ATTRIBUTE_MAPPINGS,
      "preferKebabCase",
      { from: "camelCase", to: "kebabCase" },
      isSVGElement
    );

    return {
      JSXAttribute(node: ESLintNode) {
        handleSVGMapping(node, context);
      },
    };
  },
};
