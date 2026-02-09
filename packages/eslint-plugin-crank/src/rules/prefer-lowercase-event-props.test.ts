import { describe, it } from "vitest";
import { preferLowercaseEventProps } from "./prefer-lowercase-event-props.js";
import { createTsRuleTester } from "../test-helpers/rule-tester.js";

const ruleTester = createTsRuleTester();

describe("prefer-lowercase-event-props", () => {
  it("should allow lowercase event handlers (valid Crank syntax)", () => {
    ruleTester.run("prefer-lowercase-event-props", preferLowercaseEventProps, {
      valid: [
        { code: `<button onclick={handleClick}>Click</button>` },
        { code: `<input onchange={handleChange} />` },
        { code: `<input oninput={handleInput} />` },
        { code: `<form onsubmit={handleSubmit}>Submit</form>` },
        { code: `<input onkeydown={handleKey} />` },
        { code: `<input onkeyup={handleKey} />` },
        { code: `<div onmousedown={handleMouse} />` },
        { code: `<div onmouseup={handleMouse} />` },
        { code: `<div onmouseover={handleMouse} />` },
        { code: `<div onmouseout={handleMouse} />` },
        { code: `<input onfocus={handleFocus} />` },
        { code: `<input onblur={handleBlur} />` },
        { code: `<div onscroll={handleScroll} />` },
        { code: `<div onwheel={handleWheel} />` },
        // Non-event props should not be affected
        { code: `<div customProp={value} />` },
        { code: `<div className={styles.button} />` },
        { code: `<Component myCallback={fn} />` },
      ],
      invalid: [],
    });
  });

  describe("should detect and fix React-style camelCase event handlers", () => {
    it.each([
      {
        event: "onClick",
        correct: "onclick",
        code: `<button onClick={handleClick}>Click</button>`,
        output: `<button onclick={handleClick}>Click</button>`,
      },
      {
        event: "onChange",
        correct: "onchange",
        code: `<input onChange={handleChange} />`,
        output: `<input onchange={handleChange} />`,
      },
      {
        event: "onInput",
        correct: "oninput",
        code: `<input onInput={handleInput} />`,
        output: `<input oninput={handleInput} />`,
      },
      {
        event: "onSubmit",
        correct: "onsubmit",
        code: `<form onSubmit={handleSubmit}>Submit</form>`,
        output: `<form onsubmit={handleSubmit}>Submit</form>`,
      },
    ])("should fix $event to $correct", ({ event, correct, code, output }) => {
      ruleTester.run("prefer-lowercase-event-props", preferLowercaseEventProps, {
        valid: [],
        invalid: [
          {
            code,
            output,
            errors: [
              {
                messageId: "preferLowercase",
                data: { camelCase: event, lowercase: correct },
              },
            ],
          },
        ],
      });
    });
  });

  describe("keyboard events", () => {
    it.each([
      { camel: "onKeyDown", lower: "onkeydown" },
      { camel: "onKeyUp", lower: "onkeyup" },
      { camel: "onKeyPress", lower: "onkeypress" },
    ])("should detect and fix $camel", ({ camel, lower }) => {
      ruleTester.run("prefer-lowercase-event-props", preferLowercaseEventProps, {
        valid: [],
        invalid: [
          {
            code: `<input ${camel}={handleKey} />`,
            output: `<input ${lower}={handleKey} />`,
            errors: [
              {
                messageId: "preferLowercase",
                data: { camelCase: camel, lowercase: lower },
              },
            ],
          },
        ],
      });
    });
  });

  describe("mouse events", () => {
    it.each([
      { camel: "onMouseDown", lower: "onmousedown" },
      { camel: "onMouseUp", lower: "onmouseup" },
      { camel: "onMouseOver", lower: "onmouseover" },
      { camel: "onMouseOut", lower: "onmouseout" },
      { camel: "onMouseEnter", lower: "onmouseenter" },
      { camel: "onMouseLeave", lower: "onmouseleave" },
    ])("should detect and fix $camel", ({ camel, lower }) => {
      ruleTester.run("prefer-lowercase-event-props", preferLowercaseEventProps, {
        valid: [],
        invalid: [
          {
            code: `<div ${camel}={handleMouse} />`,
            output: `<div ${lower}={handleMouse} />`,
            errors: [
              {
                messageId: "preferLowercase",
                data: { camelCase: camel, lowercase: lower },
              },
            ],
          },
        ],
      });
    });
  });

  describe("focus/blur events", () => {
    it.each([
      { camel: "onFocus", lower: "onfocus", handler: "handleFocus" },
      { camel: "onBlur", lower: "onblur", handler: "handleBlur" },
    ])("should detect and fix $camel", ({ camel, lower, handler }) => {
      ruleTester.run("prefer-lowercase-event-props", preferLowercaseEventProps, {
        valid: [],
        invalid: [
          {
            code: `<input ${camel}={${handler}} />`,
            output: `<input ${lower}={${handler}} />`,
            errors: [
              {
                messageId: "preferLowercase",
                data: { camelCase: camel, lowercase: lower },
              },
            ],
          },
        ],
      });
    });
  });

  describe("touch events", () => {
    it.each([
      { camel: "onTouchStart", lower: "ontouchstart" },
      { camel: "onTouchMove", lower: "ontouchmove" },
      { camel: "onTouchEnd", lower: "ontouchend" },
    ])("should detect and fix $camel", ({ camel, lower }) => {
      ruleTester.run("prefer-lowercase-event-props", preferLowercaseEventProps, {
        valid: [],
        invalid: [
          {
            code: `<div ${camel}={handleTouch} />`,
            output: `<div ${lower}={handleTouch} />`,
            errors: [
              {
                messageId: "preferLowercase",
                data: { camelCase: camel, lowercase: lower },
              },
            ],
          },
        ],
      });
    });
  });

  describe("drag events", () => {
    it.each([
      { camel: "onDragStart", lower: "ondragstart", handler: "handleDrag" },
      { camel: "onDragEnd", lower: "ondragend", handler: "handleDrag" },
      { camel: "onDrop", lower: "ondrop", handler: "handleDrop" },
    ])("should detect and fix $camel", ({ camel, lower, handler }) => {
      ruleTester.run("prefer-lowercase-event-props", preferLowercaseEventProps, {
        valid: [],
        invalid: [
          {
            code: `<div ${camel}={${handler}} />`,
            output: `<div ${lower}={${handler}} />`,
            errors: [
              {
                messageId: "preferLowercase",
                data: { camelCase: camel, lowercase: lower },
              },
            ],
          },
        ],
      });
    });
  });

  describe("media events", () => {
    it.each([
      { camel: "onPlay", lower: "onplay", handler: "handlePlay" },
      { camel: "onPause", lower: "onpause", handler: "handlePause" },
      { camel: "onEnded", lower: "onended", handler: "handleEnded" },
    ])("should detect and fix $camel", ({ camel, lower, handler }) => {
      ruleTester.run("prefer-lowercase-event-props", preferLowercaseEventProps, {
        valid: [],
        invalid: [
          {
            code: `<video ${camel}={${handler}} />`,
            output: `<video ${lower}={${handler}} />`,
            errors: [
              {
                messageId: "preferLowercase",
                data: { camelCase: camel, lowercase: lower },
              },
            ],
          },
        ],
      });
    });
  });

  it("should handle multiple event handlers in one component", () => {
    ruleTester.run("prefer-lowercase-event-props", preferLowercaseEventProps, {
      valid: [],
      invalid: [
        {
          code: `<button onClick={handleClick} onMouseOver={handleHover}>Hover</button>`,
          output: `<button onclick={handleClick} onmouseover={handleHover}>Hover</button>`,
          errors: [
            {
              messageId: "preferLowercase",
              data: { camelCase: "onClick", lowercase: "onclick" },
            },
            {
              messageId: "preferLowercase",
              data: { camelCase: "onMouseOver", lowercase: "onmouseover" },
            },
          ],
        },
      ],
    });
  });

  it("should handle complex components with mixed props", () => {
    ruleTester.run("prefer-lowercase-event-props", preferLowercaseEventProps, {
      valid: [],
      invalid: [
        {
          code: `
            <input
              type="text"
              value={value}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="input"
            />
          `,
          output: `
            <input
              type="text"
              value={value}
              onchange={handleChange}
              onfocus={handleFocus}
              onblur={handleBlur}
              className="input"
            />
          `,
          errors: [
            {
              messageId: "preferLowercase",
              data: { camelCase: "onChange", lowercase: "onchange" },
            },
            {
              messageId: "preferLowercase",
              data: { camelCase: "onFocus", lowercase: "onfocus" },
            },
            {
              messageId: "preferLowercase",
              data: { camelCase: "onBlur", lowercase: "onblur" },
            },
          ],
        },
      ],
    });
  });

  it("should work with TypeScript type annotations", () => {
    ruleTester.run("prefer-lowercase-event-props", preferLowercaseEventProps, {
      valid: [],
      invalid: [
        {
          code: `
            function* Component() {
              const handleClick = (e: MouseEvent) => {
                console.log(e);
              };
              yield <button onClick={handleClick}>Click</button>;
            }
          `,
          output: `
            function* Component() {
              const handleClick = (e: MouseEvent) => {
                console.log(e);
              };
              yield <button onclick={handleClick}>Click</button>;
            }
          `,
          errors: [
            {
              messageId: "preferLowercase",
              data: { camelCase: "onClick", lowercase: "onclick" },
            },
          ],
        },
      ],
    });
  });
});
