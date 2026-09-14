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

// Create isolated JSX namespace for this test file
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

// Test HTML elements (enhanced with generated attributes and DOM properties)
const htmlElements = (
  <>
    <div className="container" tabIndex={0} onclick={() => {}}>
      <input type="email" value="test@example.com" required onchange={() => {}} />
      <button disabled={false} onclick={() => {}}>Submit</button>
    </div>
  </>
);

// Test SVG elements (enhanced with DOM properties, no generated attributes yet)
const svgElements = (
  <svg viewBox="0 0 100 100" width={100} height={100}>
    <circle 
      cx={50} 
      cy={50} 
      r={40}
      fill="red"
      onclick={() => {}}
    />
    <rect 
      x={10} 
      y={10} 
      width={80} 
      height={80}
      fill="blue"
      stroke="black"
    />
    <path d="M10 10 L90 90" stroke="green" />
  </svg>
);

// Test MathML elements (enhanced with DOM properties, no generated attributes yet)
const mathElements = (
  <math display="block">
    <mrow>
      <mi>x</mi>
      <mo>=</mo>
      <mfrac>
        <mrow>
          <mo>-</mo>
          <mi>b</mi>
          <mo>±</mo>
          <msqrt>
            <mrow>
              <msup>
                <mi>b</mi>
                <mn>2</mn>
              </msup>
              <mo>-</mo>
              <mn>4</mn>
              <mi>a</mi>
              <mi>c</mi>
            </mrow>
          </msqrt>
        </mrow>
        <mrow>
          <mn>2</mn>
          <mi>a</mi>
        </mrow>
      </mfrac>
    </mrow>
  </math>
);

// Test mixed content (HTML containing SVG and MathML)
const mixedContent = (
  <div className="mixed-content">
    <h1>Mixed Content Example</h1>
    
    <p>Here's an SVG:</p>
    <svg width={200} height={100}>
      <circle cx={50} cy={50} r={30} fill="purple" />
      <text x={100} y={55} font-size="14" fill="black">SVG Text</text>
    </svg>

    <p>Here's some math:</p>
    <math>
      <mrow>
        <mi>E</mi>
        <mo>=</mo>
        <mi>m</mi>
        <msup>
          <mi>c</mi>
          <mn>2</mn>
        </msup>
      </mrow>
    </math>
  </div>
);

// Test framework attributes work on all element types
const elementsWithFrameworkAttrs = (
  <>
    <div key="html-element" ref={null}>HTML</div>
    <svg key="svg-element" ref={null}>
      <circle key="svg-child" ref={null} r={10} />
    </svg>
    <math key="mathml-element" ref={null}>
      <mi key="mathml-child" ref={null}>x</mi>
    </math>
  </>
);

// Test that event handlers work on all element types
const elementsWithEvents = (
  <>
    <div onclick={() => console.log('HTML clicked')}>HTML</div>
    <svg onclick={() => console.log('SVG clicked')}>
      <circle onclick={() => console.log('Circle clicked')} r={10} />
    </svg>
    <math onclick={() => console.log('Math clicked')}>
      <mi onclick={() => console.log('Math identifier clicked')}>x</mi>
    </math>
  </>
);