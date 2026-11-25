# @b9g/crank-hot

Hot reloading for [Crank](https://crank.js.org) components. When a file is
edited, the page updates without being loaded again:

- An edit to what a generator component renders, which is the body of its
  props loop, keeps the state of the component: its variables, its children,
  its DOM nodes, focus and what was typed.
- An edit to a function component keeps everything under it.
- An edit to anything else in a generator component starts that component
  again, and nothing above or beside it.
- An edit which throws is reported, and the page is left as it was until the
  next edit.

It is experimental, it is for development only, and it changes nothing in an
app's own code.

## Installing

```
npm install --save-dev @b9g/crank-hot typescript
```

TypeScript's compiler is how the transform reads a module, whether the
module is TypeScript or JavaScript.

### Vite

```ts
// vite.config.ts
import crankHot from "@b9g/crank-hot/vite";

export default {plugins: [crankHot()]};
```

### Bun's development server

```toml
# bunfig.toml
[serve.static]
plugins = ["@b9g/crank-hot/bun"]
```

### esbuild's development server

The build has to be a bundle in the `esm` format with an `outdir`, served by
esbuild's own server:

```ts
import * as esbuild from "esbuild";
import crankHot from "@b9g/crank-hot/esbuild";

const ctx = await esbuild.context({
	entryPoints: ["src/main.tsx"],
	bundle: true,
	format: "esm",
	outdir: "dist",
	plugins: [crankHot()],
});
await ctx.watch();
await ctx.serve({servedir: "dist"});
```

### Anything else

A development server with `import.meta.hot` can call the transform itself,
which is all that the plugins for Vite and Bun do:

```ts
import {transform} from "@b9g/crank-hot/transform";

const {code, map} = transform(source, {id: "src/counter.tsx"});
```

The result is in the language the source was in, so it goes before whatever
compiles TypeScript and JSX.

## What it helps to know

- A component is a function with a capitalized name at the top level of a
  module, or a default export. What a call returns is not one, so
  `const Fancy = withTheme(Card)` is evaluated again with its module like
  any other const.
- The loop of a generator component is the loop over its context:
  `for (props of this)`, or of its second parameter. An edit inside it keeps
  the state of the component. An edit anywhere else in it starts it again,
  and so does any edit to a component which renders in some other loop.
- A module which exports only components is replaced on its own. An edit to
  any other module also evaluates what imports it.
- A helper or a constant which is edited is seen on the next render. A
  component whose setup used it is started again, so that nothing which ran
  once is left holding an old value.
- `this.cleanup()` runs when a component is started again, like any
  unmount. What a component gave to something outside itself and did not
  take back is still there.
- In a debugger, a variable of a component is `__locals.n` inside its loop.

## Limits

- Only the page is reloaded. Nothing here reloads a server, and an app which
  a server renders with the same components takes edits in the page only.
- Webpack and Rspack are not supported.
- A variable of a module which can be assigned to (`let`) is a new variable
  every time the module is evaluated, so a component whose setup uses one is
  started again by every edit to that module.

## Trying it

`todomvc/` is TodoMVC, with the configuration for each development server:

```
bun install
bun run build             # Crank itself, in the root of the repository
cd packages/crank-hot
bun run build
bun run todomvc:vite      # or todomvc:bun, or todomvc:esbuild
```

It is at http://localhost:8000/, or at `PORT`. Add some todos, type in the
field, and edit the JSX in `todomvc/src/todo-item.tsx` or
`todomvc/src/header.tsx`: the todos, and what was typed, are still there.
Edit the code above the loop in `todomvc/src/app.tsx`: the app starts again,
without the page loading.

## Working on it

```
bun run test          # the transform and the battery of cases, with the HTML renderer
bun run test:e2e      # a browser, with each development server, and TodoMVC with each
bun run dev           # the example which the browser tests use, with Bun
bun run build         # dist/
```

## How it works

- **The view** of a generator component is the body of the loop over its
  context. Everything else in the function is its **signature**. A function
  component is all view.
- `src/compile.ts` makes the body of each such loop a function, which is
  declared straight after the loop, and registers each component with the
  runtime. The module stays in the language it was written in, and every
  line stays on the line it was written on.
- The body ran against the variables of the component, so each use of one
  in it is rewritten to go through an object which the component hands
  over: `n` becomes `__locals.n`. TypeScript says what each name refers to:
  the part of the compiler which every editor uses, given only the one
  file. A name is rewritten when what it refers to is declared in the
  component and outside the body, so `src/rewrite.ts` has no rules of its
  own about scope.
- `src/runtime.js` gives each component a wrapper which is what the rest of
  the app sees, so nothing ever holds an old version. When a module is
  evaluated again, a component whose signature is the same keeps its
  instances, and they run the body of the newest version from then on. A
  component whose signature changed is rendered as a new component.
- The code outside the loop ran once, with what the module had then, and
  kept what it made. So a component also starts again when anything which
  that code can reach is not what it was. There is one rule for what that
  means: code is the same when its source is, and a value is the same when
  it is the same value. A function of the module which the setup uses is
  code, and is followed to what it uses in turn. A const, an import and a
  global are values, compared when the module is evaluated again. A
  variable which can be assigned to is a new variable in every evaluation of
  a module, and nothing says which module `import()` is for, so neither is
  ever the same.
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

## What a component becomes

```tsx
export function* Counter({name}) { if (__hot.isExtracting()) return __hot.extract(__hotView); __hot.mount(key, this);
	let n = 0;
	for ({name} of this) { const __result = yield* __hot.view(key).call(this, {…}); … } function* __hotView(__locals) {
		const label = format(__locals.name, __locals.n);
		yield <button onclick={__locals.onclick}>{label}</button>;
	}
}
```

The loop asks the runtime for the newest view on every pass, and hands it
an object with a getter and a setter for each variable in scope.

A function declaration is there from the start of the function it is in.
So when a version of a component is taken up, the runtime calls it once for
its view: the first statement returns the function, and nothing else of the
component runs. The function comes from the newest module, and is run
against the instances of the old one through the object. Because the view
is found by calling the component, a component can be rendered before the
place in its module where it is declared.

The parameters of the component do run for that call, so it is called with
something which can be read from and taken apart without throwing, and
which is never missing, so that defaults do not run. The only code of the
component which runs is a computed key in the pattern of a parameter.

When the loop is inside a block, a function declared after it would only
be there inside that block, where the first statement cannot reach it.

A loop in a `try` statement of the component is the usual case, and the
statement is ended after the loop and started again after the view:

```tsx
try {
	for ({} of this) { … } } catch (__hotCaught) { __hotThrew = true; __hotError = __hotCaught; } function* __hotView(__locals) {
		yield <p>{__locals.n}</p>;
	} try { if (__hotThrew) throw __hotError;
} finally {
	cleanup();
}
```

What was thrown is thrown again into the `catch` and `finally` clauses as
they were written, on the lines they were written on. When there is a
`finally` clause, a return from the first part is turned into a return from
the second, so that the clause runs. Two things are different: a debugger
which stops where an error is not caught stops where it is thrown again,
and the value passed to the `return()` of the generator is not returned.

What comes after the loop in the `try` is in the second part. If the first
part declares something for the block, such as a `const` before the loop,
the second part could not see it, so the statement is not written in two
parts.

That statement, and a loop in any other block, has its view after the whole
component, and what came after the loop is moved to the line the loop
starts on, with its lines left empty. Its lines are wrong in a debugger, and when it cannot be
written on one line, the component is not separated.

In a debugger, a variable of the component is `__locals.n` in a view.

## Names

Nothing is evaluated from text, so a page needs no `unsafe-eval`, and
everything rests on the transform being right about which names in a body
are variables of the component. `test/battery/rewrite.test.tsx` has views
and `try` statements which are hard to get right, with what each should do
as snapshots.

The snapshots were recorded from another way of running a view, which has
been taken out: the body was evaluated from text inside `with` blocks, so
that the engine said what each name referred to. The engine is right about
names by definition, so they are the right answers, and a snapshot which
fails is not to be written again from what the transform does.

## Source maps

The transform only adds to lines, and to the end of a module, so every line
of a module is on the line it was written on. Whatever compiles the module
afterwards writes a source map which is right about lines without being
given one, which matters because Bun's development server does not read the
source map of a plugin. A view is code of its module, so the same goes for
it after an edit.

For what does read one, the transform writes a source map with a place for
every word of the source, so that columns are right too. A use of a
variable which was rewritten is where the name was: `__locals.n` is at `n`.

`e2e/debug.ts` checks this through the protocol which the developer tools of
Chrome use, with each development server: an error says which line of the
source it was made on, and a breakpoint on a line of the source stops there
with the variables of the component to hand, before and after an edit.

## The battery

`test/battery/` has one case per kind of edit, each with modules and a root
of its own: `views` (edits which keep state), `setup` (edits which remount),
`inputs` (what the setup uses), `functions`, `kinds` (async and unusual
shapes), `identity` (what the rest of the app holds), `crank` (keys,
provisions, events, errors), `transform` (what is written), `maps` (source
maps) and `bundle` (a whole new bundle with every edit). `e2e/` runs the
example in a browser with each of the three development servers, in
Chromium, Firefox and WebKit: a page
which renders, a page which hydrates, and a page with one component for each
thing a page can lose when it is loaded again, such as what was typed in a
form, the position of a scroller, and the state of keyed components.

## Smaller limits

- A loop which is left through a label outside it is not separated, so any
  edit to that component starts it again. So is a loop in a block when what
  comes after the loop cannot be written on one line.
- What the setup gave to something outside the component, such as a
  listener on the window, is still there after the component is started
  again unless the component removes it in a cleanup. That is so of any
  unmount.
- What the setup read from an object and kept, such as `config.limit`, is
  not noticed when the property is assigned to later. Only bindings, globals
  and properties of the global object are compared.
- The debugger tests run in Chromium only, and nobody has looked at the
  panels of the developer tools.
- With Vite, JSX which is compiled for React's development mode has props
  which Crank renders, so the plugin turns that off unless the app's
  configuration says otherwise.
