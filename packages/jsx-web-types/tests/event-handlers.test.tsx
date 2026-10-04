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
    interface IntrinsicAttributes {
      key?: string | number | null;
      ref?: any;
    }

    interface IntrinsicElements extends HTMLIntrinsicElements<FrameworkIntrinsicAttributes, FrameworkElementChildrenAttribute> {}
  }
}

// Test that event handlers are available and properly typed
const divWithEvents = (
  <div
    onclick={(event) => {
      // Test that event is properly narrowed to MouseEvent
      const clientX: number = event.clientX;
      const button: number = event.button;
      console.log('Clicked at', clientX, button);
    }}
    onmouseenter={(event) => {
      // Test that event is properly narrowed to MouseEvent
      const relatedTarget = event.relatedTarget;
      console.log('Mouse entered', relatedTarget);
    }}
  >
    Click me
  </div>
);

const inputWithEvents = (
  <input
    type="text"
    onchange={(event) => {
      // Test that event parameter is available
      const target = event.target as HTMLInputElement;
      console.log('Value changed to', target.value);
    }}
    onfocus={(event) => {
      // Test that event parameter is available
      const relatedTarget = event.relatedTarget;
      console.log('Input focused', relatedTarget);
    }}
    onkeydown={(event) => {
      // Test that event is properly narrowed to KeyboardEvent
      const key: string = event.key;
      const ctrlKey: boolean = event.ctrlKey;
      console.log('Key pressed:', key, ctrlKey);
    }}
  />
);

// Test form events
const formWithEvents = (
  <form
    onsubmit={(event) => {
      event.preventDefault();
      const formData = new FormData(event.target as HTMLFormElement);
      console.log('Form submitted', formData);
    }}
  >
    <button type="submit">Submit</button>
  </form>
);

// Test that event handlers can be null/undefined
const divWithOptionalEvents = (
  <div
    onclick={null}
    onmouseenter={undefined}
  >
    No events
  </div>
);

// Test parameter narrowing with type checks
const divWithTypeCheckedEvents = (
  <div
    onclick={(event) => {
      // Should work - MouseEvent has clientX
      const x = event.clientX;

      // @ts-expect-error - MouseEvent doesn't have key property (KeyboardEvent does)
      const key = event.key;
    }}
    onkeydown={(event) => {
      // Should work - KeyboardEvent has key
      const key = event.key;

      // @ts-expect-error - KeyboardEvent doesn't have clientX property (MouseEvent does)
      const x = event.clientX;
    }}
  >
    Type checked events
  </div>
);
