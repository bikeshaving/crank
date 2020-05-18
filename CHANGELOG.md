# Changelog
## [0.1.4] - 2020-05-17
### Fixed
- Added support for SVG elements in the DOM renderer #110
- **basic performance improvements, you want to upgrade to at least 0.1.4 and probably 0.2 when it is released**
### Changed
- got rid of the HostContext class in favor of exposing the HostNode directly to intrinsics
- added a way to pass information in a preorder traversal to child host nodes (search for Scoper/Scopes in the codebase)
- added new flags for intrinsics to optimize performance (search for dirty in the codebase)

## [0.1.3] - 2020-05-05
### Fixed
- Made event-target-shim a direct dependency so TypeScript doesn’t error #95
### Changed
- Updated the types of Component and Context to take explicit prop types #51
- Allow createElement to be passed anything as Children #97
- Allow arbitrary elements to be passed to renderer.render #97

## [0.1.2] - 2020-04-29
### Fixed
- Fixed Copy element tag not using Symbol.for #69
- Fixed event listeners not being properly removed when component is unmounted #70
- Prevented child components from causing parent components to rerender while it is already rerendering #70
- Fixed keyed element logic when an unkeyed element is placed before multiple keyed elements previously rendered
- Fixed a deadlock when errors are thrown back into async generator components: #77

## [0.1.1] - 2020-04-25
### Fixed
- Corrected boolean props not working correctly in html renderer #44
- Guarded against potential xss in style objects #44
- Wrapped non-string iterables in an implicit Fragment element #63
- Made sure stateless renders are unmounted #63

## [0.1.0] - 2020-04-14
### Added
- Initial release 🎉
