import {renderer} from "@b9g/crank/dom";
import {CrankHTMLElement} from "@b9g/crank/web-components";
import type {Context} from "@b9g/crank";

// `@b9g/crank/web-components` lets you write custom elements as Crank
// components. Subclass `CrankHTMLElement`, declare configuration as static
// fields, and write a `render` method: `this` is the element, `ctx` is the
// Crank context (an argument, not `this`), and `props` is the current
// `observedAttributes`.

// x-blink — a generator render holding a timer across renders (light DOM).
class XBlinkElement extends CrankHTMLElement {
  *render(_props: Record<string, string | null>, ctx: Context) {
    let on = true;
    // eslint-disable-next-line crank/require-cleanup-for-timers -- cleared in the ctx.cleanup below; the rule only recognizes this.cleanup, but here the context is the `ctx` argument
    const id = setInterval(() => ctx.refresh(() => (on = !on)), 750);
    ctx.cleanup(() => clearInterval(id));
    for ({} of ctx) {
      yield (
        <span style={`visibility: ${on ? "visible" : "hidden"}`}>
          <slot />
        </span>
      );
    }
  }
}

customElements.define("x-blink", XBlinkElement);

// x-marquee — shadow DOM, scoped styles, an imperative start()/stop() API, and
// typed `on<type>` handlers generated from `static events`.
class XMarqueeElement extends CrankHTMLElement<{
  events: typeof XMarqueeElement.events;
}> {
  static observedAttributes = ["scrollamount", "paused"];
  static events = ["bounce", "finish", "start"] as const;
  static shadowDOM = true;
  static styles = `
    .track {
      display: inline-block;
      white-space: nowrap;
      animation: scroll linear infinite;
    }
    @keyframes scroll {
      from { transform: translateX(100%) }
      to   { transform: translateX(-100%) }
    }`;

  render({scrollamount, paused}: Record<string, string | null>) {
    const duration = 100 / Number(scrollamount ?? 6);
    return (
      <div
        class="track"
        style={`animation-duration: ${duration}s; animation-play-state: ${
          paused != null ? "paused" : "running"
        }`}
      >
        <slot />
      </div>
    );
  }

  start() {
    this.removeAttribute("paused");
  }

  stop() {
    this.setAttribute("paused", "");
  }
}

customElements.define("x-marquee", XMarqueeElement);

// x-rating — a form-associated element. `setFormValue`/`setValidity` come from
// `ElementInternals`; the four form callbacks default to a re-render, and the
// super-able `formResetCallback`/`formStateRestoreCallback` carry the data work.
function StarRow({
  max,
  value,
  disabled,
  onpick,
}: {
  max: number;
  value: number | null;
  disabled: boolean;
  onpick: (value: number) => unknown;
}) {
  const stars = [];
  for (let i = 1; i <= max; i++) {
    const filled = value != null && i <= value;
    stars.push(
      <button
        type="button"
        disabled={disabled}
        aria-label={`${i} star${i === 1 ? "" : "s"}`}
        style={`border: none; background: none; cursor: pointer; font-size: 1.5rem; color: ${
          filled ? "gold" : "#ccc"
        }`}
        onclick={() => onpick(i)}
      >
        ★
      </button>,
    );
  }

  return <span role="radiogroup">{stars}</span>;
}

class XRating extends CrankHTMLElement {
  static formAssociated = true;
  static observedAttributes = ["max"];

  #internals = this.attachInternals();
  #value: number | null = null;
  get value() {
    return this.#value;
  }
  set value(v: number | null) {
    this.#value = v;
    this.requestUpdate();
  }

  formResetCallback() {
    super.formResetCallback(); // the render
    this.#value = null; // the work the render cannot infer
  }
  formStateRestoreCallback(state: unknown, mode: string) {
    super.formStateRestoreCallback(state, mode);
    this.#value = state == null ? null : Number(state); // the payload, off the args
  }

  *render({max}: Record<string, string | null>, ctx: Context) {
    for ({max} of ctx) {
      this.#internals.setFormValue(
        this.#value == null ? null : String(this.#value),
      );
      this.#internals.setValidity(
        this.#value == null ? {valueMissing: true} : {},
        "Pick a rating",
      );
      yield (
        <StarRow
          max={Number(max ?? 5)}
          value={this.#value}
          disabled={this.matches(":disabled")}
          onpick={(v: number) => (this.value = v)}
        />
      );
    }
  }
}

customElements.define("x-rating", XRating);

// A small demo wiring the three together.
renderer.render(
  <div>
    <h2>
      <x-blink>web components, the Crank way</x-blink>
    </h2>
    <x-marquee scrollamount="8">Slotted content scrolls past.</x-marquee>
    <form>
      <label>
        Rate it: <x-rating name="rating" max="5" />
      </label>
    </form>
  </div>,
  document.body,
);
