# Changelog
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
