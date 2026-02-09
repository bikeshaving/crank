# eslint-plugin-crank

ESLint plugin for [Crank.js](https://crank.js.org/). This plugin provides rules to help you write better Crank applications and avoid common mistakes.

## Installation

```bash
npm i -D eslint-plugin-crank
```

## Usage

### ESLint v9 Flat Config (Recommended)

Create an `eslint.config.js` file in your project root:

```javascript
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import crankPlugin from "eslint-plugin-crank";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      crank: crankPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Use the recommended configuration
      ...crankPlugin.configs.recommended.rules,
    },
  }
);
```

### Legacy ESLint Config

If you're using the legacy ESLint configuration format, add the plugin to your `.eslintrc.js`:

```javascript
module.exports = {
  extends: ["plugin:crank/recommended"],
  plugins: ["crank"],
  rules: {
    // Your custom rules here
  },
};
```

## Configurations

### `recommended`

The recommended configuration includes essential rules for writing Crank applications:

```javascript
rules: {
  ...crankPlugin.configs.recommended.rules,
}
```

### `react-migration`

A configuration specifically designed to help migrate from React to Crank. This catches React-specific syntax and suggests Crank equivalents:

```javascript
rules: {
  ...crankPlugin.configs['react-migration'].rules,
}
```

## Rules

### Core Rules

#### `crank/no-yield-in-lifecycle-methods`

Prevents using `yield` or `return` with values in lifecycle methods (`schedule`, `after`, `cleanup`). The Crank documentation explicitly warns against this pattern as it can cause unexpected behavior.

**Examples of incorrect code:**

```javascript
function* Timer(this: Context) {
  this.schedule(function* () {
    const timer = setInterval(() => {
      this.refresh();
    }, 1000);
    yield timer; // ❌ Wrong! Should not yield in schedule
  });
}

function* Component(this: Context) {
  this.after(() => {
    const element = document.getElementById("myId");
    return element; // ❌ Wrong! Should not return value from after
  });
}

function* Component(this: Context) {
  this.cleanup(() => {
    cleanup();
    return result; // ❌ Wrong! Should not return value from cleanup
  });
}
```

**Examples of correct code:**

```javascript
function* Timer(this: Context) {
  this.schedule(() => {
    const timer = setInterval(() => {
      this.refresh();
    }, 1000);
    // ✅ Correct - no yield or return with value
  });
}

function* Component(this: Context) {
  this.after(() => {
    const element = document.getElementById("myId");
    element.focus();
    // ✅ Correct - perform side effects only
  });
}

function* Component(this: Context) {
  this.cleanup(() => {
    cleanup();
    return; // ✅ Correct - empty return is allowed
  });
}
```

**Why this matters:**

- Lifecycle methods are designed for side effects, not for producing values
- Using `yield` or returning values can cause unexpected behavior in the Crank lifecycle
- The Crank documentation explicitly warns against this pattern
- Helps prevent subtle bugs related to component lifecycle

#### `crank/require-cleanup-for-timers`

Detects `setInterval` and `setTimeout` in generator components without corresponding cleanup. This prevents memory leaks by ensuring timers are properly cleared when components unmount.

**Examples of incorrect code:**

```javascript
function* Clock(this: Context) {
  let time = new Date();

  // ❌ Timer is never cleared - memory leak!
  const intervalId = setInterval(() => {
    time = new Date();
    this.refresh();
  }, 1000);

  for (const _ of this) {
    yield <div>{time.toLocaleTimeString()}</div>;
  }
}

function* SearchInput(this: Context) {
  let debounceTimer;

  const handleInput = (e) => {
    // ❌ Timer is never cleared - memory leak!
    debounceTimer = setTimeout(() => {
      performSearch(e.target.value);
    }, 300);
  };

  yield <input oninput={handleInput} />;
}

function* Timer(this: Context) {
  const timer = setInterval(() => {
    this.refresh();
  }, 1000);

  this.cleanup(() => {
    // ❌ Cleanup exists but doesn't clear the timer!
    console.log("cleanup");
  });

  yield <div>Tick</div>;
}
```

**Examples of correct code:**

```javascript
function* Clock(this: Context) {
  let time = new Date();

  const intervalId = setInterval(() => {
    time = new Date();
    this.refresh();
  }, 1000);

  // ✅ Timer is properly cleared in cleanup
  this.cleanup(() => {
    clearInterval(intervalId);
  });

  for (const _ of this) {
    yield <div>{time.toLocaleTimeString()}</div>;
  }
}

function* Timer(this: Context) {
  const timer1 = setInterval(() => {}, 1000);
  const timer2 = setTimeout(() => {}, 2000);

  // ✅ Multiple timers all cleared
  this.cleanup(() => {
    clearInterval(timer1);
    clearTimeout(timer2);
  });

  yield <div>Hello</div>;
}
```

**Why this matters:**

- Prevents memory leaks from timers that continue running after component unmount
- Ensures proper resource cleanup in long-running applications
- Timers that aren't cleared can cause unexpected behavior and performance issues
- This is one of the most common sources of memory leaks in Crank applications

#### `crank/prefer-refresh-callback`

Encourages using the callback pattern for `this.refresh()` to prevent forgetting to call refresh after state changes.

**Examples of incorrect code:**

```javascript
const onclick = () => {
  count++;
  this.refresh(); // ❌ Easy to forget!
};
```

**Examples of correct code:**

```javascript
const onclick = () =>
  this.refresh(() => {
    count++;
  }); // ✅ State change and refresh are atomic
```

**Why this matters:**

- Prevents the common bug of forgetting to call `this.refresh()` after state changes
- Makes state updates atomic - either both the state change and refresh happen, or neither
- Improves code reliability and reduces debugging time

#### `crank/prefer-props-iterator`

Encourages using `for ({} of this)` instead of `while (true)` in generator components and ensures props are properly extracted from the context.

**Examples of incorrect code:**

```javascript
function* MulCounter({ multiplier }) {
  let seconds = 0;
  while (true) {
    // ❌ Can cause infinite loops and doesn't receive prop updates
    yield <p>Multiplied value: {seconds * multiplier}</p>;
  }
}

function* MultiProp({ title, count }) {
  for ({ title } of this) {
    // ❌ Using 'count' but not extracting it from context
    yield (
      <div>
        <h1>{title}</h1>
        <p>{count}</p>
      </div>
    );
  }
}
```

**Examples of correct code:**

```javascript
function* MulCounter({ multiplier }) {
  let seconds = 0;
  for ({ multiplier } of this) {
    // ✅ Safe and receives prop updates
    yield <p>Multiplied value: {seconds * multiplier}</p>;
  }
}

function* MultiProp({ title, count }) {
  for ({ title, count } of this) {
    // ✅ All used props are extracted
    yield (
      <div>
        <h1>{title}</h1>
        <p>{count}</p>
      </div>
    );
  }
}
```

**Why this matters:**

- Prevents infinite loops that can freeze the page
- Ensures components respond to prop changes by extracting all accessed props
- Only requires extraction of props that are actually used in the loop
- Makes components more predictable and debuggable
- Supports both `this` and context parameter patterns
- Provides automatic fixes for common mistakes

### React Migration Rules

These rules help you migrate from React to Crank by catching React-specific syntax and automatically fixing it to use Crank's standard HTML conventions.

#### `crank/prefer-lowercase-event-props`

Enforces lowercase event handler props. Crank uses standard DOM event names (`onclick`) while React uses camelCase (`onClick`).

**Examples of incorrect code:**

```javascript
<button onClick={handleClick}>Click me</button>
<input onChange={handleChange} />
<div onMouseOver={handleHover} />
```

**Examples of correct code:**

```javascript
<button onclick={handleClick}>Click me</button>
<input onchange={handleChange} />
<div onmouseover={handleHover} />
```

**Auto-fix:** ✅ This rule provides automatic fixes.

**Why this matters:**
- Crank follows standard DOM conventions, not React's camelCase
- Using React syntax will cause your event handlers not to work
- Automatic fixing makes migration seamless

#### `crank/no-react-props`

Warns against using React-specific prop names. Crank uses standard HTML attribute names.

**Examples of incorrect code:**

```javascript
<div className="container">Content</div>
<label htmlFor="input-id">Label</label>
<div dangerouslySetInnerHTML={{ __html: markup }} />
```

**Examples of correct code:**

```javascript
<div class="container">Content</div>
<label for="input-id">Label</label>
<div innerHTML={markup} />
```

**Transformations:**
- `className` → `class`
- `htmlFor` → `for`
- `dangerouslySetInnerHTML={{ __html: value }}` → `innerHTML={value}`

**Auto-fix:** ✅ This rule provides automatic fixes.

**Why this matters:**
- React uses non-standard prop names to avoid JavaScript reserved words
- Crank uses standard HTML attributes directly
- This is one of the most common sources of bugs when migrating from React

#### `crank/prefer-kebab-case-svg-props`

Warns against camelCase SVG attributes (React style) and suggests kebab-case equivalents.

**Examples of incorrect code:**

```javascript
<svg>
  <path strokeWidth="2" fillOpacity="0.5" />
  <text textAnchor="middle" fontFamily="Arial" />
  <circle strokeDasharray="5,5" />
</svg>
```

**Examples of correct code:**

```javascript
<svg>
  <path stroke-width="2" fill-opacity="0.5" />
  <text text-anchor="middle" font-family="Arial" />
  <circle stroke-dasharray="5,5" />
</svg>
```

**Auto-fix:** ✅ This rule provides automatic fixes.

**Covered attributes:**
- Stroke properties: `strokeWidth`, `strokeDasharray`, `strokeLinecap`, `strokeLinejoin`, `strokeOpacity`, etc.
- Fill properties: `fillOpacity`, `fillRule`
- Text properties: `textAnchor`, `fontFamily`, `fontSize`, `fontWeight`, etc.
- Clip/mask properties: `clipPath`, `clipRule`
- Color/gradient properties: `stopColor`, `stopOpacity`
- And many more SVG presentation attributes

**Why this matters:**
- React uses camelCase for SVG attributes, but standard SVG uses kebab-case
- Using React's camelCase syntax may not work correctly in Crank
- This rule only applies to actual SVG elements, not regular HTML elements

## License

MIT
