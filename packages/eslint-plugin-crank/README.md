# eslint-plugin-crank

ESLint plugin for [Crank.js](https://crank.js.org/).

## Installation

```bash
npm i -D eslint-plugin-crank
```

## Usage

### ESLint 9 (flat config)

```javascript
// eslint.config.js
import crankPlugin from "eslint-plugin-crank";

export default [
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      crank: crankPlugin,
    },
    rules: {
      ...crankPlugin.configs.recommended.rules,
    },
  },
];
```

### ESLint 8 (eslintrc)

```json
{
  "plugins": ["crank"],
  "extends": ["plugin:crank/recommended"]
}
```

## Configurations

- **`recommended`** — All rules enabled.

## Rules

### Core Rules

#### `crank/prefer-props-iterator`

Replaces `while (true)` with `for ({} of this)` in generator components.

```javascript
// Bad
function* Counter() {
  while (true) {
    yield <div>{count}</div>;
  }
}

// Good
function* Counter() {
  for ({} of this) {
    yield <div>{count}</div>;
  }
}
```

#### `crank/prop-destructuring-consistency`

Ensures props accessed in loop body are destructured in the `for...of` pattern.

```javascript
// Bad — count won't update when props change
function* Component({ title, count }) {
  for ({ title } of this) {
    yield <div>{title} {count}</div>;
  }
}

// Good
function* Component({ title, count }) {
  for ({ title, count } of this) {
    yield <div>{title} {count}</div>;
  }
}
```

#### `crank/prefer-refresh-callback`

Encourages `this.refresh(() => { ... })` over separate mutation + `this.refresh()`.

```javascript
// Bad
const onclick = () => {
  count++;
  this.refresh();
};

// Good
const onclick = () =>
  this.refresh(() => {
    count++;
  });
```

#### `crank/no-yield-in-lifecycle-methods`

Prevents `yield` in lifecycle callbacks (`schedule`, `after`, `cleanup`). Also prevents `return` with a value in `after()`. Note: `schedule()` and `cleanup()` can be async, so returning values from them is allowed.

#### `crank/require-cleanup-for-timers`

Detects `setInterval`/`setTimeout` without cleanup. Recognizes `this.cleanup()`, post-loop cleanup, and `try`/`finally` patterns.

```javascript
// All valid cleanup patterns:
this.cleanup(() => clearInterval(timer));

for ({} of this) { yield <div>{seconds}</div>; }
clearInterval(timer);

try {
  for ({} of this) { yield <div>{seconds}</div>; }
} finally {
  clearInterval(timer);
}
```

### JSX Rules

#### `crank/jsx-uses-crank`

Marks `createElement` imports as used when JSX is present (prevents false `no-unused-vars` errors).

#### `crank/jsx-uses-vars`

Marks variables used in JSX as used (prevents false `no-unused-vars` errors).

#### `crank/jsx-no-undef`

Reports undefined variables in JSX.

#### `crank/jsx-no-duplicate-props`

Reports duplicate props in JSX elements.

### React Migration Rules

#### `crank/prefer-lowercase-event-props`

`onClick` → `onclick`. Crank uses standard DOM event names.

#### `crank/no-react-props`

`className` → `class`, `htmlFor` → `for`, `dangerouslySetInnerHTML={{ __html: v }}` → `innerHTML={v}`.

#### `crank/prefer-kebab-case-svg-props`

`strokeWidth` → `stroke-width`. Standard SVG uses kebab-case, not React's camelCase.

### Deprecated API Rules

#### `crank/no-deprecated-flush`

Detects usage of the deprecated `context.flush()` method and suggests `context.refresh()`.

#### `crank/no-deprecated-special-props`

Detects deprecated special props (`crank-key`, `crank-ref`) and suggests the current equivalents (`c-key`, `c-ref`).

## License

MIT
