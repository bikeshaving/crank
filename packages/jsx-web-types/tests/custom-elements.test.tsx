/** @jsx stub */
function stub() {}
import type { HTMLIntrinsicElements, JSXProps } from '../src/jsx-web.d';

// Define the framework types
interface FrameworkIntrinsicAttributes {
  key?: string | number | null;
  ref?: any;
}

interface FrameworkElementChildrenAttribute {
  children: any;
}

// Example: Custom button-like element that extends HTMLButtonElement
interface CustomButtonAttributes {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
}

// Example: Custom input-like element
interface CustomInputAttributes {
  label?: string;
  error?: string;
  validationRules?: string[];
}

// User augments JSX namespace with custom elements
declare global {
  namespace JSX {
    interface IntrinsicAttributes {
      key?: string | number | null;
      ref?: any;
    }

    interface IntrinsicElements extends HTMLIntrinsicElements<FrameworkIntrinsicAttributes, FrameworkElementChildrenAttribute> {
      // Custom button with button DOM properties + custom attributes
      'custom-button': JSXProps<HTMLButtonElement, CustomButtonAttributes, false, FrameworkIntrinsicAttributes, FrameworkElementChildrenAttribute>;

      // Custom input with input DOM properties + custom attributes
      'custom-input': JSXProps<HTMLInputElement, CustomInputAttributes, false, FrameworkIntrinsicAttributes, FrameworkElementChildrenAttribute>;

      // Simple custom element with just custom attributes
      'custom-card': JSXProps<HTMLElement, { title?: string; elevated?: boolean }, false, FrameworkIntrinsicAttributes, FrameworkElementChildrenAttribute>;
    }
  }
}

// Test 1: Custom button with DOM properties + custom attributes
const customButton = (
  <custom-button
    // DOM properties from HTMLButtonElement
    type="button"
    disabled={false}
    onclick={() => {}}

    // Custom attributes
    variant="primary"
    size="medium"
    loading={false}

    // Global attributes
    className="my-button"
    data-testid="custom-btn"

    // Framework attributes
    key="btn-1"
  >
    Click me
  </custom-button>
);

// Test 2: Custom input with enhanced types
const customInput = (
  <custom-input
    // DOM properties from HTMLInputElement
    type="email"
    value="test@example.com"
    placeholder="Enter email"
    required

    // Custom attributes
    label="Email Address"
    error="Invalid email format"
    validationRules={['required', 'email']}

    // Event handlers
    onchange={() => {}}
    onfocus={() => {}}
  />
);

// Test 3: Simple custom element
const customCard = (
  <custom-card
    title="Card Title"
    elevated={true}
    className="card"
    data-theme="dark"
  >
    <p>Card content</p>
  </custom-card>
);

// Test 4: Type errors should work
// @ts-expect-error - invalid variant value
const invalidVariant = <custom-button variant="invalid">Button</custom-button>;

// disabled should be boolean (enhanced from DOM property) 
const validDisabled = <custom-button disabled={true}>Button</custom-button>;

// Test 5: All custom elements get framework attributes automatically
const customElementsWithFrameworkProps = (
  <>
    <custom-button key="btn" ref={null} variant="primary">Button</custom-button>
    <custom-input key="input" ref={null} label="Input" />
    <custom-card key="card" ref={null} title="Card" />
  </>
);
