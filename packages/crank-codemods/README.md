# @b9g/crank-codemods

> **Note:** This package is unpublished and a work in progress. The API may change without notice.

Codemods for converting between Crank.js JSX syntax and tagged template syntax.

## Functions

- `JSXToTemplate(code)` - Convert JSX to tagged template literals
- `templateToJSX(code)` - Convert tagged templates back to JSX
- `JSXToTemplateTransform` - jscodeshift transform for JSX → template
- `templateToJSXTransform` - jscodeshift transform for template → JSX
