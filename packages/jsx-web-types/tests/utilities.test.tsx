/** @jsx stub */
function stub() {}
import type { JSXAttributeValue, JSXAbleProperties, JSXProps } from '../src/utilities';

// Test JSXAttributeValue accepts all valid JSX attribute values
const validStringAttr: JSXAttributeValue = "hello";
const validNumberAttr: JSXAttributeValue = 42;
const validBooleanAttr: JSXAttributeValue = true;
const validNullAttr: JSXAttributeValue = null;
const validUndefinedAttr: JSXAttributeValue = undefined;

// Test JSXAbleProperties filters DOM element properties correctly
type DivProperties = JSXAbleProperties<HTMLDivElement>;
type InputProperties = JSXAbleProperties<HTMLInputElement>;

// These should exist as properties
const hasTabIndex: DivProperties = { tabIndex: 0 };
const hasClassName: DivProperties = { className: "test" };
const hasInputType: InputProperties = { type: "text" };
const hasInputValue: InputProperties = { value: "test" };
const hasInputDisabled: InputProperties = { disabled: true };

// Test that methods are filtered out (should not compile)
// @ts-expect-error - methods should be filtered out
const hasAddEventListener: DivProperties = { addEventListener: () => {} };

// Test IntrinsicElement utility
interface TestDivAttributes {
  id?: string;
  class?: string; // Should map to className property
  tabindex?: string; // Should map to tabIndex property
  title?: string; // Regular attribute, no property
}

// Framework types for testing
interface TestIntrinsicAttributes {
  key?: string;
  ref?: any;
}

interface TestElementChildrenAttribute {
  children?: any;
}

type TestDivElement = JSXProps<HTMLDivElement, TestDivAttributes, false, TestIntrinsicAttributes, TestElementChildrenAttribute>;

// Test property mapping works at the type level
const testDiv: TestDivElement = {
  id: "test", // regular attribute
  class: "my-class", // should be enhanced from className property
  tabindex: "0", // should be enhanced from tabIndex property
  title: "tooltip" // regular attribute
};

// Test that both DOM properties AND HTML attributes are available
const testDivWithBothPropsAndAttrs: TestDivElement = {
  className: "my-class", // DOM property should work
  class: "my-class",     // HTML attribute should work
  tabIndex: 0,           // DOM property should work
  tabindex: "0",         // HTML attribute should work
};

// These assignments should work without error
const testClassName: TestDivElement = { className: "test" };
const testClass: TestDivElement = { class: "test" };
const testTabIndex: TestDivElement = { tabIndex: 0 };
const testTabindex: TestDivElement = { tabindex: "0" };

// Test JSXAbleProperties filtering - event handlers should be included, methods should be excluded
const testDivPropsWithEvents: DivProperties = {
  onclick: () => {}, // Event handler property - should work
  onchange: () => {}, // Event handler property - should work
  tabIndex: 0,
  className: "test"
};

// Test specific method filtering
// @ts-expect-error - addEventListener method should be filtered out
const testAddEventListener: DivProperties = { addEventListener: () => {} };

// @ts-expect-error - dispatchEvent method should be filtered out
const testDispatchEvent: DivProperties = { dispatchEvent: () => true };

// @ts-expect-error - click method should be filtered out
const testClickMethod: DivProperties = { click: () => {} };
