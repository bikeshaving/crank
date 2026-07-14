/** @jsx stub */
function stub() {}
import type { HTMLIntrinsicElements } from '../src/jsx-web.d';

// Define framework types
interface FrameworkIntrinsicAttributes {
  key?: string | number | null;
  ref?: any;
}

interface FrameworkElementChildrenAttribute {
  children?: any;
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends HTMLIntrinsicElements<FrameworkIntrinsicAttributes, FrameworkElementChildrenAttribute> {}
  }
}

// Test 1: className -> class property mapping
const divWithClassName = <div className="test-class" />;

// Test 2: tabIndex -> tabindex property mapping
const divWithTabIndex = <div tabIndex={0} />;

// Test 3: Both DOM properties AND HTML attributes should work
const divWithBothPropsAndAttrs = (
  <div
    className="my-class"
    class="my-class"
    tabIndex={0}
    tabindex="0"
  />
);

// Test 3: Input DOM properties that should work
const inputWithDOMProps = <input type="text" value="test" disabled={false} />;

// Test 4: Boolean properties
const inputWithBooleans = (
  <input
    disabled={true}
    required={false}
    checked={true}
    multiple={false}
    readOnly={true}
  />
);

// Test 5: String/number properties
const inputWithStringNumber = (
  <input
    name="test-input"
    placeholder="Enter text"
    maxLength={100}
    minLength={5}
    size={20}
    tabIndex={0}
  />
);

// Test 6: Textarea DOM properties
const textareaWithDOMProps = (
  <textarea
    value="textarea content"
    defaultValue="default"
    rows={10}
    cols={50}
  />
);

// Test 7: Button DOM properties
const buttonWithDOMProps = (
  <button
    type="submit"
    disabled={false}
    name="submit-btn"
    value="submit-value"
  >
    Submit
  </button>
);

// Test 8: Property enhancement should accept JSXAttributeValue types
const jsxAttributeValues = (
  <input
    value="string"
    tabIndex={42}
    disabled={true}
    placeholder={undefined}
    name={null}
  />
);

// Test 9: numeric attributes are permissive. JSX accepts string forms of
// numbers (e.g. tabindex="0"), and the value types intentionally don't try to
// reject non-numeric strings — that distinction isn't worth enforcing at the
// type level. So these compile rather than error.
const tabIndexString = <div tabIndex="not-a-number" />;
const maxLengthString = <input maxLength="not-a-number" />;
const rowsString = <textarea rows="not-a-number" />;

// disabled allows strings in JSX (gets converted to boolean)
const validDisabledString = <input disabled="true" />;

// These should work - numbers can be strings for attributes
const validNumericStrings = (
  <input
    tabindex="0"      // HTML attribute - string OK
    maxlength="100"   // HTML attribute - string OK  
    size="20"         // HTML attribute - string OK
  />
);
