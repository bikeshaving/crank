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
- `src/transform.ts` compiles a module to JavaScript, then adds a few lines
  to the top of each such loop and registers each component with the
  runtime. The body of the loop is left as it was written, and is also passed
  to the runtime as text. The transform reads declarations and copies text;
  it never works out what a name in the body of a loop refers to.
- `src/runtime.js` gives each component a wrapper which is what the rest of
  the app sees, so nothing ever holds an old version. When a module is
  evaluated again, a component whose signature is the same keeps its
  instances, and they run the new body from then on. The body is made with
  the `Function` constructor, and reaches the variables of the instance
  through `with` and an object of getters and setters, so the engine resolves
  each name. A component whose signature changed is rendered as a new
  component.
- The code outside the loop ran once, with the values the module had then.
  The transform lists the bindings of the module which that code uses.
  Functions of the same module are part of the signature, by their source,
  and everything else is compared by value when the module is evaluated
  again. If any is a different value, the component is remounted.
- A const which is named like a component and declared with a call, such as
  `const Fancy = withTheme(Card)`, keeps its value while the call and what it
  uses are the same, and is registered as a component when it is a function.
- An edit which throws the first time it renders is reported, and the
  component shows what it last rendered until the next edit. A setup which
  throws leaves the version before it in place.
- `src/bun.ts` and `src/vite.ts` are plugins for the development servers of
  Bun and Vite, which replace a module in the page when it changes. A module
  which only exports components accepts its own replacement.
- `src/esbuild.ts` is a plugin for esbuild's development server, which
  builds a whole new bundle instead. Each bundle is evaluated in the page
  alongside the ones before it, so every module is evaluated again.
  `src/graph.ts` gives every top-level binding of the app a hash of its
  source and of everything it refers to, and a function, class or const
  whose hash is the same keeps its value. A component is the same function
  through every edit, so a reference to one is never a change. The packages
  which the app imports are built once and shared.

## Source maps

The transform only adds to the ends of lines, so the lines of a module are
the lines which the compiler wrote, and the source map of the compiler is
the source map of the module. An edited view is evaluated so that it starts
at the line and column it has in its module, and is given the same map.
Columns are not exact on a line which was added to.

## The battery

`test/battery/` has one case per kind of edit, each with modules and a root
of its own: `views` (edits which keep state), `setup` (edits which remount),
`inputs` (what the setup uses), `functions`, `kinds` (async and unusual
shapes), `identity` (what the rest of the app holds), `crank` (keys,
provisions, events, errors), `transform` (what is written), `maps` (source
maps) and `bundle` (a whole new bundle with every edit). `e2e/` runs the
example in a browser with each of the three development servers, with a
page which renders and a page which hydrates.

## What is not done

- Apps which a server renders with the same components: the page takes
  edits, and nothing here reloads the server, or the page when only the
  server's code changed.
- Shovel. Its client bundles are built by esbuild, so the plugin is the
  part it needs, and its development server would have to tell the page
  when a build has finished.
- A loop which is left through a label outside it is not separated, so any
  edit to that component remounts it.
- A variable of a module which can be assigned to is a new variable every
  time the module is evaluated, so a component whose setup uses one is
  remounted by every edit to that module.
- The browser tests run in Chromium and WebKit, and the battery runs with
  the HTML renderer.
- Nothing has been looked at in the developer tools of a browser: the
  source maps are tested by reading them.
- Pages need `unsafe-eval` in development. Without it the page says so and
  is loaded again on each edit to a view.
