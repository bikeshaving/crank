/** @jsx createElement */
import type { WebIntrinsicElements } from '../src/jsx-web.d';

// Define the framework types
interface FrameworkIntrinsicAttributes {
  key?: string | number | null;
  ref?: any;
}

interface FrameworkElementChildrenAttribute {
  children: any;
}

// Create the intrinsic elements with framework types
type TestIntrinsicElements = WebIntrinsicElements<FrameworkIntrinsicAttributes, FrameworkElementChildrenAttribute>;

// Create isolated JSX namespace for children testing
declare function createElement<K extends keyof TestIntrinsicElements>(
  type: K,
  props: TestIntrinsicElements[K],
  ...children: any[]
): any;

declare namespace createElement {
  namespace JSX {
    interface IntrinsicElements extends TestIntrinsicElements {}
  }
}

// Test 1: Non-void elements should accept children
const nonVoidWithChildren = (
  <div>
    <span>Text content</span>
    <p>More content</p>
  </div>
);

const nonVoidWithTextChildren = (
  <section>
    This is text content
  </section>
);

// Test 2: void/empty elements are not specially typed. They accept children
// like any other element — forbidding `<br>x</br>` at the type level isn't
// worth the machinery, and the runtime simply ignores stray children. (Some of
// these are even valid: SVG shapes permit descriptive child elements.)
const formerVoidWithChildren = (
  <div>
    <img src="a.jpg">caption</img>
    <br>text</br>
    <input type="text">label</input>
    <svg>
      <circle>
        <title>A labeled circle</title>
      </circle>
      <path>
        <desc>A described path</desc>
      </path>
    </svg>
    <math>
      <mspace>
        <mi>x</mi>
      </mspace>
    </math>
  </div>
);

// Test 5: Valid children usage
const validChildren = (
  <div>
    <svg>
      <g>
        <rect width="100" height="100" />
        <circle cx="50" cy="50" r="25" />
      </g>
    </svg>
    <math>
      <mrow>
        <mi>x</mi>
        <mo>=</mo>
        <mn>42</mn>
        <mspace width="1em" />
      </mrow>
    </math>
  </div>
);

// Test 6: Framework attributes should work on all elements including void ones
const voidElementsWithFrameworkAttrs = (
  <>
    <img src="test.jpg" key="img1" ref={null} />
    <br key="br1" ref={null} />
    <input type="text" key="input1" ref={null} />
    <circle cx="50" cy="50" r="10" key="circle1" ref={null} />
    <mspace width="1em" key="space1" ref={null} />
  </>
);