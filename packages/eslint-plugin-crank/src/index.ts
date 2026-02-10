import {preferRefreshCallback} from "./rules/prefer-refresh-callback.js";
import {preferPropsIterator} from "./rules/prefer-props-iterator.js";
import {propDestructuringConsistency} from "./rules/prop-destructuring-consistency.js";
import {preferLowercaseEventProps} from "./rules/prefer-lowercase-event-props.js";
import {noReactProps} from "./rules/no-react-props.js";
import {noReactSvgProps} from "./rules/no-react-svg-props.js";
import {noYieldInLifecycleMethods} from "./rules/no-yield-in-lifecycle-methods.js";
import {requireCleanupForTimers} from "./rules/require-cleanup-for-timers.js";
import {jsxUsesCrank} from "./rules/jsx-uses-crank.js";
import {jsxUsesVars} from "./rules/jsx-uses-vars.js";
import {jsxNoUndef} from "./rules/jsx-no-undef.js";
import {jsxNoDuplicateProps} from "./rules/jsx-no-duplicate-props.js";
import {noDeprecatedFlush} from "./rules/no-deprecated-flush.js";
import {noDeprecatedSpecialProps} from "./rules/no-deprecated-special-props.js";

export const rules = {
	"prefer-refresh-callback": preferRefreshCallback,
	"prefer-props-iterator": preferPropsIterator,
	"prop-destructuring-consistency": propDestructuringConsistency,
	"prefer-lowercase-event-props": preferLowercaseEventProps,
	"no-react-props": noReactProps,
	"no-react-svg-props": noReactSvgProps,
	"no-yield-in-lifecycle-methods": noYieldInLifecycleMethods,
	"require-cleanup-for-timers": requireCleanupForTimers,
	"jsx-uses-crank": jsxUsesCrank,
	"jsx-uses-vars": jsxUsesVars,
	"jsx-no-undef": jsxNoUndef,
	"jsx-no-duplicate-props": jsxNoDuplicateProps,
	"no-deprecated-flush": noDeprecatedFlush,
	"no-deprecated-special-props": noDeprecatedSpecialProps,
};

export const configs = {
	recommended: {
		plugins: ["crank"],
		rules: {
			// Allow empty destructuring pattern for `for ({} of this)`
			"no-empty-pattern": "off",
			"crank/prefer-refresh-callback": "error",
			"crank/prefer-props-iterator": "error",
			"crank/prop-destructuring-consistency": "error",
			"crank/prefer-lowercase-event-props": "error",
			"crank/no-react-props": "error",
			"crank/no-yield-in-lifecycle-methods": "error",
			"crank/require-cleanup-for-timers": "error",
			"crank/no-react-svg-props": "error",
			"crank/jsx-uses-crank": "error",
			"crank/jsx-uses-vars": "error",
			"crank/jsx-no-undef": "error",
			"crank/jsx-no-duplicate-props": "error",
			"crank/no-deprecated-flush": "error",
			"crank/no-deprecated-special-props": "error",
		},
	},
};

export const plugin = {
	rules,
	configs,
};

export default plugin;
