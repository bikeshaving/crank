# Crank hot

An experiment in hot reloading for Crank components. It is not published. An edit to what a component
renders keeps its state, and an edit to anything else in it remounts it.

```
bun run test          # the transform and the battery of cases, with the HTML renderer
bun run test:e2e      # a browser, with Bun's development server
bun run dev           # the example, at http://localhost:8000/
```

## How it works

- **The view** of a generator component is the body of the first loop it
  yields in. Everything else in the function is its **signature**. A function
  component is all view.
- `src/transform.ts` compiles a module to JavaScript, then adds a few lines to
  the top of each such loop and registers each component with the runtime.
  The body of the loop is left as it was written, and is also passed to the
  runtime as text. The transform reads declarations and copies text; it
  never works out what a name in a body refers to.
- `src/runtime.js` gives each component a wrapper which is what the rest of the
  app sees, so nothing ever holds an old version. When a module is evaluated
  again, a component whose signature is the same keeps its instances, and
  they run the new body from then on. The body is made with the `Function`
  constructor, and reaches the variables of the instance through `with` and
  an object of getters and setters, so the engine resolves each name. A
  component whose signature changed is rendered as a new component.
- `src/bun.ts` is a plugin for Bun's development server. A module which only
  exports components accepts its own replacement.

## The battery

`test/battery/` has one case per kind of edit, each with modules and a root of
its own: `views` (edits which keep state), `setup` (edits which remount),
`functions`, `kinds` (async and unusual shapes), `identity` (what the rest of
the app holds), `crank` (keys, provisions, events, errors), `transform` (what
is written) and `gaps`. A failing test in `gaps` states what should happen
and passes for as long as it does not.

## What is not done

- No source maps: the compiled module has the lines of the TypeScript
  compiler's output, and an edited view has none.
- A component whose setup uses a helper from a module which changed keeps
  the old helper until it is remounted.
- Only Bun's development server. Nothing for Vite, esbuild or Shovel.
- A component is a top-level function with a capitalized name. A default
  export without a name, and the result of calling a function, are not
  registered.
- A loop with a `var` in it, or which uses `arguments`, is not separated, so
  any edit to that component remounts it.
- A setup which throws after an edit takes the component down. A view which
  throws is reported, and the component shows what it last rendered.
- Pages need `unsafe-eval` in development.
