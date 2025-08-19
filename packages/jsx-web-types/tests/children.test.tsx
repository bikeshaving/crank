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

// Test 2: Void elements should NOT accept children (these should error)
// Currently these probably don't error - we need to make them error

// @ts-expect-error - img is void, should not accept children
const voidWithChildren = (
  <img>
    <span>This should not be allowed</span>
  </img>
);

// @ts-expect-error - br is void, should not accept children  
const voidWithText = (
  <br>
    Text content should not be allowed
  </br>
);

// @ts-expect-error - input is void, should not accept children
const voidInput = (
  <input>
    <label>This should not work</label>
  </input>
);

// Test 3: SVG void elements
// @ts-expect-error - circle is self-closing, should not accept children
const svgVoidWithChildren = (
  <svg>
    <circle>
      <text>This should not be allowed</text>
    </circle>
  </svg>
);

// @ts-expect-error - path is self-closing, should not accept children
const pathVoidWithChildren = (
  <svg>
    <path>
      <g>This should not be allowed</g>
    </path>
  </svg>
);

// Test 4: MathML void elements
// @ts-expect-error - mspace is empty, should not accept children
const mathmlVoidWithChildren = (
  <math>
    <mspace>
      <mi>This should not be allowed</mi>
    </mspace>
  </math>
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