---
title: "@b9g/crank"
publish: true
---

# @b9g/crank

The core Crank.js module containing all fundamental APIs for creating and rendering elements.

## Installation

```bash
npm install @b9g/crank
```

## Functions

- [createElement](/api/core/functions/createElement) - Creates a Crank element
- [cloneElement](/api/core/functions/cloneElement) - Clones an existing element
- [isElement](/api/core/functions/isElement) - Checks if a value is a Crank element

## Classes

- [Element](/api/core/classes/Element) - The element class representing virtual DOM nodes
- [Context](/api/core/classes/Context) - The context object passed to components
- [Renderer](/api/core/classes/Renderer) - Base class for creating custom renderers

## Interfaces

- [RenderAdapter](/api/core/interfaces/RenderAdapter) - Interface for implementing custom rendering targets

## Types

- [Tag](/api/core/types/Tag) - Union type for valid element tags
- [Child](/api/core/types/Child) - Type for a single child value
- [Children](/api/core/types/Children) - Type for children including nested iterables
- [Component](/api/core/types/Component) - Type for component functions
- [ElementValue](/api/core/types/ElementValue) - Type for rendered element values

## Components

- [Fragment](/api/core/components/Fragment) - Groups elements without a wrapper
- [Portal](/api/core/components/Portal) - Renders children into a different root
- [Copy](/api/core/components/Copy) - Preserves previously rendered content
- [Text](/api/core/components/Text) - Renders text nodes explicitly
- [Raw](/api/core/components/Raw) - Injects raw HTML or nodes
