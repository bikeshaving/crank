import { preferRefreshCallback } from "./rules/prefer-refresh-callback.js";
import { preferPropsIterator } from "./rules/prefer-props-iterator.js";
import { preferLowercaseEventProps } from "./rules/prefer-lowercase-event-props.js";
import { noReactProps } from "./rules/no-react-props.js";
import { preferKebabCaseSvgProps } from "./rules/prefer-kebab-case-svg-props.js";
import { noYieldInLifecycleMethods } from "./rules/no-yield-in-lifecycle-methods.js";
import { requireCleanupForTimers } from "./rules/require-cleanup-for-timers.js";

export const rules = {
  "prefer-refresh-callback": preferRefreshCallback,
  "prefer-props-iterator": preferPropsIterator,
  "prefer-lowercase-event-props": preferLowercaseEventProps,
  "no-react-props": noReactProps,
  "prefer-kebab-case-svg-props": preferKebabCaseSvgProps,
  "no-yield-in-lifecycle-methods": noYieldInLifecycleMethods,
  "require-cleanup-for-timers": requireCleanupForTimers,
};

export const configs = {
  recommended: {
    plugins: ["crank"],
    rules: {
      "crank/prefer-refresh-callback": "error",
      "crank/prefer-props-iterator": "error",
      "crank/prefer-lowercase-event-props": "error",
      "crank/no-react-props": "error",
      "crank/no-yield-in-lifecycle-methods": "error",
      "crank/require-cleanup-for-timers": "error",
    },
  },
  "react-migration": {
    plugins: ["crank"],
    rules: {
      "crank/prefer-lowercase-event-props": "error",
      "crank/no-react-props": "error",
      "crank/prefer-kebab-case-svg-props": "warn",
    },
  },
};

export const plugin = {
  rules,
  configs,
};

export default plugin;
