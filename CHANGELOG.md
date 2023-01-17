# Changelog
## [0.5.0] - 2023-01-17

### Breaking changes
- The internal `RendererImpl` method `escape()` has been renamed to `text()`.
- The internal `RendererImpl` method `parse()` has been renamed to `raw()`, and the value is always passed to this method, regardless of if the value prop is a string.
- Generator components which return will now restart rather than stay stuck on the returned value. This should help when debugging components which have accidentally returned.

### Quality of life improvements
- Special props like `crank-key`, shortened to `c-key`, have an additional `$`-prefixed variant. Going forward, this will be the preferred syntax.
	```ts
	<div $key={key} $ref={ref} $static />
	```
- Generator components which are in a `for...of` or `for await...of` loop will now
attempt to exit the loop gracefully, so that cleanup code can go after the loop.
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
- Async generator components can now use for...of loops. Async generator components which yield from a for...of loop will behave like sync generator components, pausing at each yield.
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

### New Features
- The automatic JSX runtime transform is now supported.
- Hydration: The DOM Renderer now provides a `hydrate()` method which will attempt to re-use DOM nodes already found on the page. A corresponding `hydrate()` method has been defined for custom renderers.
- Crank now provides a tagged template function called `jsx` which replicates JSX syntax and allows templates to be written with vanilla JavaScript.
- Calling `dispatchEvent()` on a component context will now trigger any `onevent` style props.

### Bug Fixes
- Errors which are thrown in Context event listener functions will not prevent other listeners from being called.
- Async generator components will now correctly re-run for latest props.
- IFrame/IMG `src` and other props which are sensitive to being re-assigned will not be re-assigned.
- $static elements which are re-rendered with different tags will now correctly re-render.

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
