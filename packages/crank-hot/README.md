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
- `src/transform.ts` makes the body of each such loop a function, which is
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

When the loop is inside a block, such as a `try`, a function declared after
it would only be there inside that block. Then the function goes after the
whole component, and what came after the loop is moved to the line the
loop starts on, with its lines left empty. Its lines are wrong in a
debugger, and when it cannot be written on one line, the component is not
separated. `this.cleanup()` in place of `try` and `finally` avoids it.

In a debugger, a variable of the component is `__locals.n` in a view.

## Evaluating text

With `evaluate: true`, or `CRANK_HOT_EVALUATE=1` for the plugins, the body
of a loop is left as it was written, and is also compiled to a function in
JavaScript and passed to the runtime as text. After an edit the runtime
makes the function with the `Function` constructor, inside `with` blocks
over the object from the component and the bindings of the module, so the
engine says what each name refers to. A page has to allow that with
`unsafe-eval`. Without it the page says so, and is loaded again on each
edit to a view.

This is how it was first done. It is kept because the engine is right
about names by definition: `test/battery/rewrite.test.tsx` runs views which
are hard to get right both ways and compares them, which is the check on
what TypeScript is asked. The whole battery and the browser tests run both
ways.

## Source maps

The transform only adds to lines, and to the end of a module, so every line
of a module is on the line it was written on. Whatever compiles the module
afterwards writes a source map which is right about lines without being
given one, which matters because Bun's development server does not read the
source map of a plugin. A view is code of its module, so the same goes for
it after an edit.

When text is evaluated, an edited view is a script of its own, named for
its module. It is compiled with its body where it is in the module, so the
map which the compiler writes for it is to the lines and columns of the
module, and the runtime gives the script that map.

`e2e/debug.ts` checks both through the protocol which the developer tools of
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
- With Vite, JSX which is compiled for React's development mode has props
  which Crank renders. The test turns that off with `oxc.jsx.development`.
