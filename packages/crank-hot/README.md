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
- `src/transform.ts` adds a few lines to the top of each such loop and
  registers each component with the runtime. The module stays in the
  language it was written in, and the body of the loop is left as it was
  written. The body is also compiled to a function in JavaScript, which is
  passed to the runtime as text. The transform reads declarations and copies
  text; it never works out what a name in the body of a loop refers to.
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
  What it uses which is not a binding of the module is compared too: a
  global, a property of the global object as far as it is written, and
  `import()`, which makes the component different every time, because
  nothing says which module it is for. Only what a component declares for
  all of itself is taken to be its own, so a name which a block inside it
  also declares is not missed.
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

## Without evaluating text

With `rewrite: true`, or `CRANK_HOT_REWRITE=1` for the plugins, nothing is
evaluated from text and a page does not need `unsafe-eval`.

The body of a loop becomes a function of the module, which is passed the
object of getters and setters. Nothing resolves its names for it, so
`src/rewrite.ts` works out which names in the body are variables of the
component, and rewrites each use: `n` becomes `__locals.n`. A name is one
when the component has a variable with that name in scope at the loop, and
nothing between the use and the body declares the name again.

The function has to be on the lines the body was on, and after the
component, so what came after the loop is moved to the line the loop starts
on:

```tsx
for ({name} of this) { const __result = yield* __hot.view(key).call(this, {…}); … } } __hot.setView(key, function* (__locals) {
	const label = format(__locals.name, __locals.n);
	yield <button onclick={__locals.onclick}>{label}</button>;
});
```

What this costs:

- The code which runs is not the code which was written, from the first
  render, where the other way runs the body as it was written until an edit.
- A mistake in working out a name reads or writes the wrong variable. The
  other way cannot make that mistake, so `test/battery/rewrite.test.tsx`
  runs views which are hard to get right both ways and compares them.
- In a debugger, a variable of the component is `__locals.n` in a view.
- What came after the loop is on one line, so its lines are wrong in a
  debugger. When it cannot be written on one line, the component is not
  separated.
- A component which is rendered by a statement above it in its own module
  has no view yet.

What it gains: an edited view is ordinary code of its module, with the
source map of whatever compiled the module, and the JSX it was compiled
with.

The whole battery and the browser tests run both ways.

## Source maps

The transform only adds to lines, and to the end of a module, so every line
of a module is on the line it was written on. Whatever compiles the module
afterwards writes a source map which is right about lines without being
given one, which matters because Bun's development server does not read the
source map of a plugin.

An edited view is a script of its own, named for its module. It is compiled
with its body where it is in the module, so the map which the compiler
writes for it is to the lines and columns of the module, and the runtime
gives the script that map.

`e2e/debug.ts` checks both through the protocol which the developer tools of
Chrome use, with each development server: an error says which line of the
source it was made on, and a breakpoint on a line of the source stops there
with the variables of the component in scope, before and after an edit.

## The battery

`test/battery/` has one case per kind of edit, each with modules and a root
of its own: `views` (edits which keep state), `setup` (edits which remount),
`inputs` (what the setup uses), `functions`, `kinds` (async and unusual
shapes), `identity` (what the rest of the app holds), `crank` (keys,
provisions, events, errors), `transform` (what is written), `maps` (source
maps) and `bundle` (a whole new bundle with every edit). `e2e/` runs the
example in a browser with each of the three development servers: a page
which renders, a page which hydrates, and a page with one component for each
thing a page can lose when it is loaded again, such as what was typed in a
form, the position of a scroller, and the state of keyed components.

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
- The browser tests run in Chromium and WebKit, and the debugger tests in
  Chromium. Nobody has looked at the panels of the developer tools.
- What the setup gave to something outside the component, such as a
  listener on the window, is still there after a remount unless the
  component removes it in a cleanup. That is so of any unmount.
- What the setup read from an object and kept, such as `config.limit`, is
  not noticed when the property is assigned to later. Only bindings, globals
  and properties of the global object are compared.
- The JSX of an edited view is compiled to Crank's `createElement`, whatever
  the module compiles its own JSX to.
- With Vite, JSX which is compiled for React's development mode has props
  which Crank renders. The test turns that off with `oxc.jsx.development`.
- Pages need `unsafe-eval` in development. Without it the page says so and
  is loaded again on each edit to a view.
