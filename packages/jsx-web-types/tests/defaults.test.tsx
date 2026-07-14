/** @jsx createElement */
import type {WebIntrinsicElements} from "../src/jsx-web.d";

// Zero-config: WebIntrinsicElements works with no type parameters. The defaults
// are framework-neutral — no special attributes, a `children` prop, and no value
// overrides — so the common case needs no boilerplate.
type DefaultIntrinsicElements = WebIntrinsicElements;

declare function createElement<K extends keyof DefaultIntrinsicElements>(
  type: K,
  props: DefaultIntrinsicElements[K],
  ...children: any[]
): any;

declare namespace createElement {
  namespace JSX {
    interface IntrinsicElements extends DefaultIntrinsicElements {}
  }
}

// Attributes across all three namespaces resolve, and children are accepted by
// default.
const html = <div class="x" id="y">hello</div>;
const anchor = <a href="z">link</a>;
const svg = (
  <svg viewBox="0 0 10 10">
    <circle cx="5" cy="5" r="4" fill="red" />
  </svg>
);
const math = (
  <math>
    <mrow>
      <mi>x</mi>
    </mrow>
  </math>
);

// The single-namespace variants default the same way.
type HTMLOnly = import("../src/jsx-web.d").HTMLIntrinsicElements;
const htmlOnly: HTMLOnly["span"] = {class: "c"};
