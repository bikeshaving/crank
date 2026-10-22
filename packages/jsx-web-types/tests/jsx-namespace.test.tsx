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

// Declare JSX namespace like frameworks do
declare global {
  namespace JSX {
    interface IntrinsicAttributes {
      key?: string | number | null;
      ref?: any;
    }

    // Our types should work as IntrinsicElements
    interface IntrinsicElements extends HTMLIntrinsicElements<FrameworkIntrinsicAttributes, FrameworkElementChildrenAttribute> {}
  }
}

// Test framework attributes work with HTML attributes
const divWithFrameworkProps = (
  <div
    key="test-key"
    ref={null}
    id="test-div"
    className="test-class"
  >
    Content
  </div>
);

const inputWithFrameworkProps = (
  <input
    key="input-key"
    ref={null}
    type="text"
    value="test"
  />
);

// Custom elements moved to separate test file

// Test that framework attributes are optional
const minimalElementWithoutFrameworkProps = (
  <div id="minimal">No key/ref required</div>
);

// Test type errors for invalid values
// @ts-expect-error - key should be string/number/null, not object
const invalidKey = <div key={{}}>Invalid</div>;

// @ts-expect-error - nonexistent attribute
const invalidAttribute = <div nonexistent="value">Invalid</div>;
