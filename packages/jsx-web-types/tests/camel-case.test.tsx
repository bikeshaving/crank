/** @jsx createElement */
import type {CamelCaseIntrinsicElements} from "../src/camel-case.generated.d";

// A framework supplies its own reserved props (key/ref/…), exactly like the
// standard types.
interface ReactReservedProps {
  key?: string | number;
  ref?: unknown;
  dangerouslySetInnerHTML?: {__html: string};
}

type R = CamelCaseIntrinsicElements<ReactReservedProps>;
declare function createElement<K extends keyof R>(
  type: K,
  props: R[K],
  ...children: any[]
): any;
declare namespace createElement {
  namespace JSX {
    interface IntrinsicElements extends R {}
  }
}

// camelCase prop names work (sourced from React's possibleStandardNames.js):
const a = <div className="x" id="y" tabIndex={0} />;
const b = <label htmlFor="field">Name</label>;
const c = <input readOnly maxLength={10} />;
const d = <div dangerouslySetInnerHTML={{__html: "<b>x</b>"}} />;

// Attributes with no camelCase rename keep their platform name:
const e = <a href="z">link</a>;

// The platform spellings are renamed away in this variant:
// @ts-expect-error - `class` becomes `className`
const f = <div class="x" />;
// @ts-expect-error - `for` becomes `htmlFor`
const g = <label for="field" />;
// @ts-expect-error - `tabindex` becomes `tabIndex`
const h = <div tabindex={0} />;
