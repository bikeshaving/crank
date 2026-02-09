import {Rule} from "eslint";
import {ESLintNode} from "../utils/types.js";
import {
	createConditionalJSXAttributeMapper,
	isNativeElement,
} from "../utils/jsx-utils.js";

// Common event handlers that should be lowercase in Crank (vs React's camelCase)
const EVENT_HANDLERS = [
	"onClick",
	"onChange",
	"onInput",
	"onSubmit",
	"onKeyDown",
	"onKeyUp",
	"onKeyPress",
	"onMouseDown",
	"onMouseUp",
	"onMouseOver",
	"onMouseOut",
	"onMouseEnter",
	"onMouseLeave",
	"onMouseMove",
	"onFocus",
	"onBlur",
	"onDblClick",
	"onContextMenu",
	"onDrag",
	"onDragEnd",
	"onDragEnter",
	"onDragLeave",
	"onDragOver",
	"onDragStart",
	"onDrop",
	"onScroll",
	"onWheel",
	"onCopy",
	"onCut",
	"onPaste",
	"onLoad",
	"onError",
	"onAbort",
	"onCanPlay",
	"onCanPlayThrough",
	"onDurationChange",
	"onEmptied",
	"onEncrypted",
	"onEnded",
	"onLoadedData",
	"onLoadedMetadata",
	"onLoadStart",
	"onPause",
	"onPlay",
	"onPlaying",
	"onProgress",
	"onRateChange",
	"onSeeked",
	"onSeeking",
	"onStalled",
	"onSuspend",
	"onTimeUpdate",
	"onVolumeChange",
	"onWaiting",
	"onTouchStart",
	"onTouchMove",
	"onTouchEnd",
	"onTouchCancel",
	"onPointerDown",
	"onPointerMove",
	"onPointerUp",
	"onPointerCancel",
	"onPointerEnter",
	"onPointerLeave",
	"onPointerOver",
	"onPointerOut",
	"onSelect",
	"onReset",
];

// Create a map for quick lookups
const EVENT_HANDLER_MAP = new Map(
	EVENT_HANDLERS.map((handler) => [handler, handler.toLowerCase()]),
);

export const preferLowercaseEventProps: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Enforce lowercase event handler props (onclick not onClick) - Crank uses lowercase unlike React's camelCase",
			category: "Best Practices",
			recommended: true,
		},
		fixable: "code",
		schema: [],
		messages: {
			preferLowercase:
				"Event handler '{{camelCase}}' should be lowercase '{{lowercase}}' in Crank (unlike React)",
		},
	},

	create(context) {
		// Convert the Map to a plain object for the mapper
		const eventHandlerMappings = Object.fromEntries(EVENT_HANDLER_MAP);

		// Create the mapper for event handler replacements, only for native elements
		const handleEventMapping = createConditionalJSXAttributeMapper(
			eventHandlerMappings,
			"preferLowercase",
			{from: "camelCase", to: "lowercase"},
			isNativeElement,
		);

		return {
			JSXAttribute(node: ESLintNode) {
				handleEventMapping(node, context);
			},
		};
	},
};
