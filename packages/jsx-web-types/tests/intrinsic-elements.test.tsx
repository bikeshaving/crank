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

// Test basic HTML elements work
const validDiv = <div id="test">Hello</div>;
const validSpan = <span className="test">World</span>;
const validInput = <input type="text" value="test" />;
const validButton = <button disabled>Click me</button>;

// Test attributes are optional
const minimalDiv = <div>Content</div>;
const minimalInput = <input />;

// Test common attributes work on all elements
const divWithGlobalAttrs = (
  <div
    id="test"
    className="my-class"
    title="Tooltip"
    lang="en"
    dir="ltr"
    hidden
    tabIndex={0}
    aria-label="Test div"
    data-testid="div-element"
  >
    Content
  </div>
);

// Test element-specific attributes
const inputWithSpecificAttrs = (
  <input
    type="email"
    name="email"
    placeholder="Enter email"
    required
    autocomplete="email"
    maxLength={100}
    pattern="[^@]+@[^@]+\.[^@]+"
  />
);

const buttonWithSpecificAttrs = (
  <button
    type="submit"
    form="my-form"
    disabled
    autofocus
  >
    Submit
  </button>
);

// Test void elements
const voidElements = (
  <>
    <img src="test.jpg" alt="Test" />
    <br />
    <hr />
    <input type="text" />
    <meta name="description" content="Test" />
  </>
);
