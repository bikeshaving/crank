# Changelog
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
