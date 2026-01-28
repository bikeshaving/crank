# Changelog
## [0.7.4] - 2026-01-28
### New Features
- **Allow spaces in class object syntax keys** (#328)
  Class names with spaces are now supported in the object syntax:
  ```jsx
  <div class={{"hello world": true}} />
  // renders: <div class="hello world"></div>
  ```
  Overlapping classes across keys are handled correctly—truthy keys always win:
  ```jsx
  <div class={{"a b": false, "b c": true}} />
  // renders: <div class="b c"></div>  (b preserved)
  ```

### Improvements
- **Remove global document/window references from DOM renderer** (#329)
  The DOM renderer no longer relies on global `document` or `window` objects.
  Instead, it derives the document from the root element via `root.ownerDocument`.
  This enables Crank to work correctly in environments with multiple documents
  (e.g., iframes, Shadow DOM, SSR hydration) and makes it compatible with
  custom DOM implementations like TermDOM.

  The `RenderAdapter` interface now includes a `root` parameter in all methods
  (`create`, `adopt`, `text`, `scope`, `patch`, `arrange`, `remove`, `raw`)
  to support this change.

## [0.7.3] - 2025-11-27
### Bug Fixes
- **Fix URL property comparison for src and href attributes** (#321)
  The DOM property for `src` and `href` returns the resolved absolute URL,
  while the prop value may be a relative URL. This caused unnecessary DOM
  updates on every render when using relative URLs, which would reload iframes
  and cause infinite loops with onload handlers. Now we resolve the prop value
  using `new URL(value, element.baseURI)` before comparing, maintaining the
  "DOM as source of truth" philosophy while correctly handling URL normalization.
  This completes the fix from #181.

## [0.7.2] - 2025-10-23
### Bug Fixes
- **Fix spurious warnings for schedule+refresh pattern in generators** (#299)
  Components using `schedule(() => this.refresh())` patterns in for...of loops
  would incorrectly trigger "multiple yields" warnings in async generator
  components. Added `IsSchedulingRefresh` flag to distinguish between scheduled
  callbacks and refresh-triggered scheduling, preventing false warnings for
  legitimate schedule+refresh patterns.
- **Fix Suspense race condition where fallback and content render simultaneously** (#297)
  Fixed a race condition where Suspense fallback components and resolved
  content could both be visible at the same time. The issue occurred when
  fallback components triggered propagations from inactive/unmounted components.
  Added `isRetainerActive()` function with iterative tree traversal and host
  boundary optimization to validate propagation paths and prevent inactive
  components from contributing DOM nodes to the final render.

## [0.7.1] - 2025-08-20
### New Features
- Crank now supports MathML (https://github.com/bikeshaving/crank/pull/308)
- Crank now supports React-style style objects for props (https://github.com/bikeshaving/crank/pull/301)
### Bug Fixes
- Passing `null` to the style prop will no longer throw
## [0.7.0] - 2025-08-14
### New Features
- **The `refresh()` method can now take a callback.**
  Users frequently complained about forgetting to call `refresh()` after
  updating state. I realized we can solve these problems with a `refresh()`
  callback. Starting in 0.7, the `refresh()` function can be passed a callback
  which is executed immediately before re-rendering. By putting state updates
  in the callback, you’ll never forget to call `refresh()` ever again. This
  callback is also useful for inline event handlers.

  **Before:**
  ```jsx
  function *Timer() {
    let seconds = 0;
    const interval = setInterval(() => {
      seconds++;
      this.refresh();
    }, 1000);

    for ({} of this) {
      yield <div>{seconds}</div>;
    }

    clearInterval(interval);
  }

  function *Counter() {
    let count = 0;
    const onclick = () => {
      count++;
      this.refresh();
    };

    for ({} of this) {
      yield (
        <button onclick={onclick}>
          Button pressed {count} time{count !== 1 && "s"}.
        </button>
      );
    }
  }
  ```

  **After:**
  ```jsx
  function *Timer() {
    let seconds = 0;
    const interval = setInterval(() => this.refresh(() => seconds++), 1000);

    for ({} of this) {
      yield <div>{seconds}</div>;
    }

    clearInterval(interval);
  }

  function *Counter() {
    let count = 0;
    for ({} of this) {
      yield (
        <button onclick={() => this.refresh(() => count++)}>
          Button pressed {count} time{count !== 1 && "s"}.
        </button>
      );
    }
  }
  ```

  If the callback is async, `this.refresh()` will be deferred until the
  callback has finished. I am deeply embarrassed that I didn’t think of this
  API before, and I actually only implemented it last minute because Claude
  hallucinated it. It’s such a good idea it might be backported to previous
  versions.

- **BREAKING**: Renamed `flush()` to `after()` (with deprecation warning for backward compatibility). The `flush()` method was confusingly named because it does not cause re-renders nor does it cause pending changes to be flushed to the DOM. The method has been renamed to `after()` for clarity.
  ```jsx
  function Component() {
    this.after((el) => {
      // Run code after the component renders
    });
  }
  ```
- **Async Component System Overhaul**
  Crank's async architecture has been completely redesigned for better
  coordination and predictable rendering behavior. Most notably, Crank now
  employs a two-pass rendering architecture, where DOM mutations only occur
  after the entire tree has settled. This change has numerous benefits.
  - Eliminates tearing: Async siblings render together instead of independently, preventing inconsistent UI states
    ```jsx
    function UserInfo({userID}) {
      // UserProfile and UserComments are async components.
      // In 0.6 and earlier, after the initial render, the components would
      // re-render independently.
      // In 0.7, the components will always re-render together, unless the
      // components themselves re-render independently via `refresh()` or
      // `for await...of`.
      return (
        <div>
          <UserProfile userID={userID} />
          <UserComments userID={userID} />
        </div>
      );
    }
    ```
  - Parallel hydration: In 0.5 basic hydration support was added. However,
    because async components render independently, the hydration process caused
    the component tree to run siblings in sequence, rather than in parallel. In
    0.7, hydration is always run in parallel.
  - **BREAKING CHANGE** Generator promises: In async generator components using
    `for await...of`, `yield` always returns a promise representing children,
    even for synchronous children
    ```jsx
    async function *Component({children}) {
      for await ({children} of this) {
        // In 0.6 and earlier, result might be a promise or the rendered result,
        // depending on if the children contained async components.
        // In 0.7, result will always be a promise, because this component
        // might have async siblings.
        const result = yield children;
      }
    }
    ```
    Sync generator components, and async generator components using `for...of`
    loops are not affected by this change, as they will always wait for their
    children before re-rendering.
  - **BREAKING CHANGE** Async generators without props loops: Async generator
    components which are not in a props loop now behave like sync generator
    components.
    ```jsx
    // Async generator with while loop - behaves like sync generator
    async function *Component() {
      while (true) {
        const data = await fetch('/api/data');
        // In 0.7, the component will now pause at this yield, rather than
        // continuing.
        yield <div>{data}</div>;
      }
    }

    // Async generator yielding before props loop - initial yield behaves like sync
    async function *LoadingComponent() {
      // Outside of a for await loop, this component will pause at this yield.
      yield <div>Loading...</div>;

      for await ({} of this) {
        const data = await fetch('/api/data');
        yield <div>{data}</div>; // Now yields promises as expected
      }
    }
    ```

    This behavior makes it even easier to convert sync generator components to
    async generator components. If you want the old continuously resuming
    behavior, you can call `refresh()` in an `after()` callback before each yield.
    ```jsx
    async function *Timer() {
      let i = 0;
      while (true) {
        this.after(() => this.refresh());
        yield <span>{i} seconds</span>;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    ```
- **Racing components don't lose state**
  Previously, when multiple async components were racing to render, some
  components could lose their state, and DOM would be destroyed and recreated.
  In 0.7, if a component continuously wins its races, its state and DOM will be
  preserved.
  ```jsx
  async function *Suspense({fallback, children}) {
    for await ({fallback, children} of this) {
      // In 0.6 and earlier, the children would always be unmounted and remounted.
      // In 0.7, children will stay mounted if they re-render faster than the fallback.
      yield <Fallback>{fallback}</Fallback>;
      yield children;
    }
  }
  ```
- **`@b9g/crank/async` module**
  A new public module `@b9g/crank/async` has been added to the npm exports, providing utilities for working with async components and rendering patterns. Includes `lazy`, `Suspense`, and `SuspenseList` components.

  ```jsx
  import {lazy, Suspense, SuspenseList} from "@b9g/crank/async";

  // Lazy-loaded components
  const LazyComponent = lazy(() => import('./MyComponent'));
  const LazyDefault = lazy(() => import('./DefaultExport')); // Works with default exports

  // Basic suspense with timeout
  function App() {
    return (
      <Suspense fallback={<div>Loading...</div>} timeout={100}>
        <LazyComponent prop="value" />
      </Suspense>
    );
  }

  // SuspenseList coordination
  // Unlike React and others, Suspense components do not have to be direct
  // children of the SuspenseList component, so long as they render immediately
  // after the SuspenseList component (not as children of an async component).
  function Dashboard() {
    return (
      <SuspenseList revealOrder="forwards" tail="collapsed">
        <Suspense fallback={<div>Loading A...</div>}>
          <AsyncComponentA />
        </Suspense>
        <div>
          <Suspense fallback={<div>Loading B...</div>}>
            <AsyncComponentB />
          </Suspense>
        </div>
        <Suspense fallback={<div>Loading C...</div>}>
          <AsyncComponentC />
        </Suspense>
      </SuspenseList>
    );
  }

  // Different reveal orders
  <SuspenseList revealOrder="together">     {/* All at once */}
  <SuspenseList revealOrder="forwards">     {/* First to last */}
  <SuspenseList revealOrder="backwards">    {/* Last to first */}

  // Fallback control
  <SuspenseList tail="collapsed">  {/* Show only next fallback */}
  <SuspenseList tail="hidden">     {/* Hide all fallbacks */}
  ```
- **Async unmounting for exit animations**
  Added async unmounting support via async `cleanup()` callbacks. Components can now perform exit animations and other asynchronous operations before being removed from the DOM.

  ```jsx
  function *FadeOut() {
    this.cleanup(async (el) => {
      // Animate out before unmounting
      el.style.transition = 'opacity 300ms';
      el.style.opacity = '0';
      await new Promise(resolve => setTimeout(resolve, 300));
    });

    for ({} of this) {
      yield <div>Fading content</div>;
    }
  }

  function *Modal() {
    this.cleanup(async (el) => {
      // Slide out animation
      el.classList.add('slide-out');
      await new Promise(resolve =>
        el.addEventListener('animationend', resolve, {once: true})
      );
    });

    for ({} of this) {
      yield <div class="modal">Modal content</div>;
    }
  }
  ```
- **Async mounting for complex mounting coordination**
  Similar to the `cleanup()` callback, the `schedule()` callback can now be asynchronous to defer mounting as well.
  The SuspenseList component is implemented using this feature and you can check the source to see usages.
  Async mounting can also be used with the HTML renderer to render twice, when you need to extract CSS, for instance.

  ```jsx
  // Example: CSS-in-JS extraction with emotion
  export function* Root(this: Context, {title, children, url, storage}) {
    for ({title, children, url, storage} of this) {
      this.schedule(() => this.refresh());

      // First render to extract the HTML
      const childrenHTML = yield (
        <Page storage={storage}>
          <div id="navbar-root">
            <Navbar url={url} />
          </div>
          {children}
        </Page>
      );

      // Extract critical CSS from the rendered HTML
      const {html, css} = extractCritical(childrenHTML);

      // Second render with the extracted CSS inlined
      yield (
        <Page storage={storage}>
          <html lang="en">
            <head>
              <title>{title}</title>
              <style>{css}</style>
              <link rel="stylesheet" href="styles/client.css" />
            </head>
            <body>
              <Raw value={html} />
            </body>
          </html>
        </Page>
      );
    }
  }
  ```

  Async scheduling for non-initial renders has not been implemented, mainly due
  to its difficulty.
- **Context `isExecuting` / `isUnmounted` properties**
  Added `isExecuting` and `isUnmounted` properties to Context for better component introspection and lifecycle management. This is mainly useful to squash warnings when you accidentally refresh components when they are already executing or unmounted.

  ```jsx
  // Only refresh if not currently executing and not unmounted
  if (!this.isExecuting && !this.isUnmounted) {
    this.refresh();
  }

  // Check if component was unmounted during async operation
  if (this.isUnmounted) {
    break;
  }
  ```
- **Promise-returning overloads for `schedule()`, `after()`, and `cleanup()` when called with no arguments:**
  ```typescript
  await this.schedule(); // Wait for commit
  await this.after();    // Wait for children fully rendered
  await this.cleanup();  // Wait for cleanup
  ```
- **The `copy` prop can now be a string for host elements**
  The `copy` prop now accepts string values to specify which props should be copied from the previous render. Use `copy="!value"` to copy all props except `value`, or `copy="class children"` to copy only specific props. The meta-prop syntax does not allow mixing of bang and non-bang syntax.

  ```jsx
  // Copy all props except value (useful for leaving the value uncontrolled)
  <input copy="!value" type="text" placeholder="Enter text..." />

  // Copy only specific props
  <div copy="class id" class="container" id="main" data-test="foo" />

  // Copy children from previous render
  <div copy="children" class="dynamic-class">
    {/* children will be preserved from previous render */}
  </div>

  // The Copy element tag can also be used for copying behavior.
  <input type="text" value={initial ? value : Copy} />
  ```
- **Hydration warnings and `hydrate` prop**
  Added comprehensive hydration mismatch warnings to help developers identify and fix server-client rendering inconsistencies during development. Also added a special `hydrate` prop for fine-grained hydration control.

  ```jsx
  // Disable hydration for entire subtree
  <div hydrate={false}>
    {/* This content won't be hydrated */}
  </div>

  // Include portal children in hydration
  <Portal hydrate={true}>
    {/* Portal children will be hydrated */}
  </Portal>

  // Selective prop hydration (like copy prop)
  <input hydrate="!value" type="text" placeholder="Will hydrate" />
  <div hydrate="class id" class="hydrated" id="main" data-skip="ignored" />
  ```
- **The `class` prop can now take objects.**
  The class property can now take an object instead of a string for basic `clsx` / `classnames` behavior.

  ```jsx
  function *Button() {
    let isActive = false;
    let isDisabled = false;

    for ({} of this) {
      yield (
        <button
          class={{
            btn: true,
            'btn-active': isActive,
            'btn-disabled': isDisabled,
            'btn-large': true
          }}
          onclick={() => this.refresh(() => isActive = !isActive)}
        >
          Toggle
        </button>
      );
    }
  }

  // Equivalent to: class="btn btn-large" (when inactive)
  // Or: class="btn btn-active btn-large" (when active)
  ```

  The class object prop can be used to prevent Crank from clobbering props
  provided by third-party scripts, as it uses `classList.add()` and `.remove()`
  under the hood.
- **`@b9g/crank/event-target` module**
  Crank's `EventTarget` class has been extracted into a separate public module. This module can be used when implementing custom renderers and provides better modularity.
- **Utility types `ComponentProps<T>` and `ComponentPropsOrProps<T>`**
  Added new TypeScript utility types for better type inference when working with component props.
- **New `<Text>` element and Text node rendering**
  Renderers now return actual `Text` nodes instead of strings, and a new `<Text>` element has been added for explicit text node creation.

  ```jsx
  // New <Text> element for explicit text nodes
  function Component() {
    return <Text value="Hello world" />;
  }

  // Components can now access Text nodes directly
  function *InteractiveText() {
    this.schedule((node) => {
      if (node instanceof Text) {
        node.textContent = "Updated!";
        console.log("Got actual Text node:", node);
      }
    });

    for ({} of this) {
      yield "Initial text"; // This becomes a Text node
    }
  }

  // Each string gets its own Text node (no more concatenation)
  function MultipleTexts() {
    return (
      <div>
        {"First "}{"Second "}{"Third"} // Three separate Text nodes
      </div>
    );
  }
  ```

  This change improves performance during reconciliation and hydration, enables direct DOM manipulation, and maintains better text node tracking.
- **Cooperative DOM rendering**
  Crank will no longer remove nodes which it doesn't control. This makes it
  safe to render directly to `document.body`, and any nodes added by third-party
  scripts or components will stay in the DOM unless their parent is also removed.

  Note: Crank will emit a warning when `hydrate()` is called on `document.body`,
  as hydration is destructive and expects to match the entire body content.
- **Custom renderer API stability**
  The custom renderer API has been stabilized and documented for building
  third-party renderers.

### Bug Fixes
- The error handling for async generator components has been improved.
   Previously, errors thrown in `for await` loops might cause unhandled
   rejections even if they were handled by a `refresh()` or
   `renderer.render()` call.

## [0.6.1] - 2025-04-21
### Features
- Added `prop:` and `attr:` prefixes to disambiguate props which should be treated as element properties vs attributes.
- Added `html` alias for the `jsx` template tag in JavaScript.
### Bug Fixes
- Added missing `copy` prop to TypeScript types.
- Fix `copy` prop being rendered by HTML renderer.
## [0.6.0] - 2024-04-26
### Breaking Changes
- Special props are now unprefixed. All special prefixed props are deprecated.
- Special props are now passed into components via props.
- The `ref` prop behavior has been changed. For host elements, the callback is fired once when the element is created. For component elements, the callback must be manually passed to one of the component’s children to fire. The `ref` callback will have no effect for other elements like `<Fragment>`.
- The special `static` prop has been renamed to `copy` to avoid collisions with the `static` keyword.
- The `context.value` property, which allows you to access the current rendered value of a component from the context, has been deprecated.
- Elements which are reused between renders will skip rendering. This means you have to clone elements between renders if you want them to rerender.
### Features
- Component contexts are now passed to components as the second parameter.
- React style camelCased event names (`onChange`, `onInput`) are now supported.
- Stale renders are skipped with using `for await...of` in async generator components.
- Components will now warn when yielding multiple times per props iteration.
## [0.5.7] - 2023-12-05
- Fix keyed elements disappearing incorrectly, a bug introduced in 0.5.5
## [0.5.6] - 2023-11-07
- Fix `foreignObject` children having the wrong `xmlns` (https://github.com/bikeshaving/crank/pull/268 by (@canadaduane)
## [0.5.5] - 2023-11-06
- Fix keyed component elements not cleaning up properly https://github.com/bikeshaving/crank/issues/267
## [0.5.4] - 2023-05-22
### Bug Fixes
- Fix DOM renderer bug where input of `type="text"` does not appear in the DOM, causing surprising CSS styling issues (https://github.com/bikeshaving/crank/pull/258 by @waynebaylor)
## [0.5.3] - 2023-03-12
### Bug Fixes
- The cleanup() functions will be called even if components are unmounted. https://github.com/bikeshaving/crank/issues/249
- Fixes a situation where component errors in async components were being ignored. https://github.com/bikeshaving/crank/issues/253
## [0.5.2] - 2023-02-03
### Bug Fixes
- Allow `Context<typeof Component>` context types to be passed components with
	0 parameters.
- Alias jsx-dev-runtime to jsx-runtime for parcel/other bundlers
- Disable hydration mismatch warnings until we figure out the expected DX for
	warning suppression.

## [0.5.1] - 2023-02-02
### Bug Fixes
- Fixed a bug where refreshing hydrated components throws errors.

## [0.5.0] - 2023-02-01

### Breaking changes
- The internal `RendererImpl` method `escape()` has been renamed to `text()`.
- The internal `RendererImpl` method `parse()` has been renamed to `raw()`, and
	the value `prop` is always passed into this method, regardless of whether the
	value is a string.
- Generator components which return will restart when re-rerendered, rather
	than staying stuck on the returned value. This should help debugging
	components which have accidentally returned.

### Quality of life improvements
- Special props like `crank-key`, have an additional `$`-prefixed variant.
	Going forward, this will be the preferred syntax, but `crank-key` and `c-key`
	will continue to be supported as well.
	```ts
	<div $key={key} $ref={ref} $static />
	```
- Generator components which are in a `for...of` or `for await...of` loop will
	now attempt to exit normally, so that cleanup code can be placed after the
	loop.
	```ts
	// before
	function Counter() {
		let i = 0;
		const interval = setInterval(() => {
			i++;
			this.refresh();
		}, 1000);
		try {
			for ({} of this) {
				yield <div>{i}</div>;
			}
		} finally {
			clearInterval(interval);
		}
	}

	// after
	function Counter() {
		let i = 0;
		const interval = setInterval(() => {
			i++;
			this.refresh();
		}, 1000);
		for ({} of this) {
			yield <div>{i}</div>;
		}
		clearInterval(interval);
	}
	```
- Async generator components can now use for...of loops. Async generator
	components which yield from a for...of loop behave like sync generator
	components, pausing at each yield.
	```ts
	async function Counter() {
		let i = 0;
		const interval = setInterval(() => {
			i++;
			this.refresh();
		}, 1000);
		for ({} of this) {
			yield <div>{i}</div>;
		}

		clearInterval(interval);
	}
	```
- The `Context` type can now be passed a function type as its first parameter
	to strongly type the `this` props iterators.
	```ts
	function *MyComponent(
		this: Context<typeof MyComponent>,
		{name}: {name: string},
	) {

		// name will be correctly inferred
		for ({name} of this) {
			yield <div>Hello name</div>;
		}
	}
	```

### New Features
- The automatic JSX runtime transform is now supported. Here is the babel
	configuration.
	```ts
	plugins: [
		babelPluginSyntaxJSX,
		[
			babelPluginTransformReactJSX,
			{
				runtime: "automatic",
				importSource: "@b9g/crank",
			},
		],
	],
	```

- Hydration: The DOM Renderer now provides a `hydrate()` method which will
	attempt to re-use DOM nodes already found on the page. A corresponding
	`hydrate()` method has been defined for custom renderers.
- Crank now provides a tagged template function called `jsx` which replicates
	JSX syntax and allows templates to be written with vanilla JavaScript.
	```ts
	import {jsx} from "@b9g/crank/standalone";
	import {renderer} from "@b9g/crank/standalone";
	function Greeting({
		name
	}) {
		return jsx`
			<div>Hello ${name}</div>
		`;
	}

	renderer.render(jsx`<${Greeting} name="world" />`, document.body);
	```
- Calling `dispatchEvent()` on a component context will now trigger any
	`onevent` style props.

### Bug Fixes
- Errors which are thrown in Context event listener functions will not prevent
	other listeners from being called.
- Async generator components should run more predictably.
- IFrame/IMG `src` and other props which are sensitive to being re-assigned
	will not be re-assigned.
- `$static` elements which are re-rendered with different tags will now
	correctly re-render.

## [0.4.4] - 2022-08-08
### Fixed
- Inlined event listener methods to avoid errors caused by bundling (#238).
## [0.4.3] - 2022-06-25
### Fixed
- Fix readonly DOM properties not being set correctly (#231).
## [0.4.2] - 2021-12-20
### Fixed
- Fix null/undefined in className property for HTML renderer.
## [0.4.1] - 2021-10-29
### Added
- `createElement` and `Fragment` have been added to default module exports, to work with more JSX tools (#219).
### Fixed
- The HTMLRenderer will now correctly render `className` props (#221).
- Fixed a bug where `<Raw />` elements with parsed string values would lose their contents when rerendered (#224).
### Changed
- As part of #224, the internal `RendererImpl.parse()` method can now take any `ElementValue<TNode>` instead of `TNode`.
- The `./` export which was added in 0.4 was removed from package.json.
- The `main` and `module` fields will now point to crank.js.
## [0.4.0] - 2021-10-08
### Added
- Special props `crank-key`, `crank-ref`, `crank-static` now have shorthand equivalents `c-key`, `c-ref`, and `c-static` to save on typing.
- Crank is now published under the NPM package `@b9g/crank`, as well as the old `@bikeshaving/crank`. Again, this saves on typing.
- The `Context.prototype.flush()` method has been added. It behaves similarly to `Context.prototype.schedule()`, with the exception that it runs after a component’s children is in the DOM. This is important for things like focusing after render. See #180 for motivation.
- The `c-skip` (`crank-skip`) prop has been added as an alternative to `<Copy />` elements. See #173 for motivation and `src/__tests__/static.tsx` for examples.
### Changed
- I gave up and we now use `.cjs` files instead of `/cjs` directories for commonjs fallbacks.
- `innerHTML` now checks against the old prop value rather than reading from the DOM.
- Properties and styles which are missing from DOM element props will now be removed.
  Crank 0.3 tried to implement uncontrolled properties by saying missing props were uncontrolled. For instance, `<div class="class" />` rerendered as `<div />` would preserve the class property even though it was removed. Starting in 0.4, missing props and styles will be removed from DOM elements between renders.
- Crank will now log a console error when `undefined` is yielded or returned from a component. To squash these warnings, yield or return `null` instead.
- The default type for `TagProps` is now `Record<string, unknown>` as opposed to `unknown`.
- Crank will no longer attempt to reuse or modify elements. Motivated by #198.
- Internal context properties have been hidden using a symbol.
- The internal Renderer API has been overhauled yet again.
  - All internal methods which are implemented by the various renderers (`create()`, `patch()`, `arrange()`) have been removed from the base renderer class. Instead, you will now have to pass in these methods via a call to `super()` in the constructor. See `src/dom.ts` or `src/html.ts` for examples.
  - The `complete()` method has been renamed to `flush()`.
  - `patch()` now runs per prop as opposed to passing all props.
  - `patch()` now runs in a post-order call of the tree (yet again).
  - The signatures of all of the methods have been changed, mainly to avoid passing elements into the renderer, and allow for previous values to be inspected and used.
### Fixed
- Fixed some edge cases where event bubbling would result in `"Generator is already executing.
- Assigning to `boolean` properties with strings like `spellcheck="true"` will now work as expected. See #175 for motivation.
"` errors.
## [0.3.11] - 2021-05-11
### Fixed
- Crank will now always create new elements for internal nodes to prevent subtle aliasing bugs (#198).
- Fixed an edge case where a scheduled refresh failed to update the component when the produced child was a component (#199).
- Optimized multiple components scheduling a refresh synchronously (#155).
## [0.3.10] - 2021-04-30
### Fixed
- Fixed Copy elements of async generator components causing parents to hang (#197).
## [0.3.9] - 2021-03-05
### Fixed
- Fixed style strings being incorrectly rendered by the HTMLRenderer (#191).
## [0.3.8] - 2020-12-27
### Fixed
- Various performance improvements.
### Changed
- `create()` and `patch()` calls have been moved to a pre-order traversal of the tree.
- The DOM renderer now checks properties and attributes before mutating them.
## [0.3.7] - 2020-11-16
Mostly some changes when trying to get Crank to play nicely with contenteditables
### Fixed
- Fixed TypeScript sourcemaps not being generated in builds (#165).
- Fixed empty arrays or otherwise non-empty element children not clearing out non-Crank DOM mutations (#167).
- Fixed rerenderings updating DOM Text nodes even when the contents have not changed (#169).
## [0.3.6] - 2020-10-13
### Fixed
- Changed the algorithm of patch slightly so that `setAttribute` is never used with object/function values.
## [0.3.5] - 2020-09-17
### Fixed
- Added ChildIterable type to exports to deal with TypeScript errors (#156).
## [0.3.4] - 2020-09-09
### Fixed
- Fix some edge cases with async generator component rendering.
## [0.3.3] - 2020-08-25
### Fixed
- Use ducktyping rather than instanceof checks for cross realm use-cases like nw.js (#147).
## [0.3.2] - 2020-08-06
### Changed
- Duplicate keys and calling refresh on an unmounted or already executing component will now log errors to the console.
- Changes to some of the error messages thrown by Crank.
## [0.3.1] - 2020-07-30
### Added
- Added official support for Deno. ESM build files now include a triple-slash reference to sibling d.ts files, and the d.ts files have been checked to work in deno.
- The core file has been moved from `index.js` to `crank.js`, following deno best practices. The `index.js` export is now an alias file.
- Module Augmentation is now available via a global `Crank` module.
### Deprecated
- The class `StringRenderer` in the html module has been renamed to `HTMLRenderer`. The `StringRenderer` export is now an alias and will be removed in the next breaking release.
## [0.3.0] - 2020-07-28
### Changed
- The context methods `get` and `set` are now named `provide` and `consume`.
- Changes to the internal renderer APIs in preparation for initial documentation.
  - Elements are passed in directly, rather than their tag and props.
  - The scope is now no longer passed to the patch method.
### Fixed
- Fixed errors not propagating from function component children.
- The context async iterator now suspends at its start if you yield before iterating over it (#137).
## [0.2.1] - 2020-07-02
### Fixed
- Fixed overloads of Context.prototype.set and Context.prototype.get not appearing in the d.ts file.
## [0.2.0] - 2020-07-01
### Changed
- Props are no longer rememebered between renders. For instance, rendering `<input checked />` and then `<input />` will not cause the checked prop to be deleted on the actual element.
- The internal Renderer API has been changed to use inheritance and away from the intrinsic generator API.
- `Renderer.prototype.render` and `Context.prototype.refresh` now return rendered values rather than undefined.
- The library is no longer transpiled.
- The esm directory in the package has been deleted. Refer to index, dom and html in the root of the package instead.
- Some types have been simplified
  - Tag no longer takes a type parameter.
  - The types `Props`, `FunctionComponent`, `GeneratorComponent`, `IntrinsicProps`, `ChildIterator`, `ChildGenerator` and `Key` have been removed from the public API.
### Added
- UMD build.
- `crank-ref` props.
- `Context.prototype.schedule`.
- `Context.prototype.cleanup`.
- `Context.prototype.props`.
- `Context.prototype.value`.
- `dispatchEvent` now does bubbling and capturing correctly.
### Fixed
- Performance improvements in terms of execution time, runtime memory costs, and library size.
- Fixed `Context.prototype.dispatchEvent` not responding to `stopPropagation` and `stopImmediatePropagation`.
- Fixed nested SVG elements not rendering SVGElements in some cases.
- Improved error handling.

## [0.1.6] - 2020-05-25
- Backed out of a performance optimization where async generator components caused siblings to remain in the DOM.
## [0.1.5] - 2020-05-21
- Fixed SVG attributes causing readonly errors (#119).
## [0.1.4] - 2020-05-17
### Fixed
- Added support for SVG elements in the DOM renderer (#110).
- **basic performance improvements, you want to upgrade to at least 0.1.4 and probably 0.2 when it is released**
### Changed
- Got rid of the `HostContext` class in favor of exposing the HostNode directly to intrinsics.
- Added a way to pass information in a preorder traversal to child host nodes (search for Scoper/Scopes in the codebase).
- Added new flags for intrinsics to optimize performance (search for dirty in the codebase).

## [0.1.3] - 2020-05-05
### Fixed
- Made `event-target-shim` a direct dependency so TypeScript doesn’t error (#95).
### Changed
- Updated the types of `Component` and `Context` to take explicit prop types (#51).
- Allow createElement to be passed anything as `Children` (#97).
- Allow arbitrary elements to be passed to `Renderer.prototype.render` (#97).

## [0.1.2] - 2020-04-29
### Fixed
- Fixed `Copy` element tag not using `Symbol.for` (#69).
- Fixed event listeners not being properly removed when component is unmounted (#70).
- Prevented child components from causing parent components to rerender while it is already rerendering (#70).
- Fixed keyed element logic when an unkeyed element is placed before multiple keyed elements previously rendered.
- Fixed a deadlock when errors are thrown back into async generator components (#77).

## [0.1.1] - 2020-04-25
### Fixed
- Corrected boolean props not working correctly in html renderer (#44).
- Guarded against potential xss in style objects (#44).
- Wrapped non-string iterables in an implicit Fragment element (#63).
- Made sure stateless renders are unmounted (#63).

## [0.1.0] - 2020-04-14
### Added
- Initial release 🎉
