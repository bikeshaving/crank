---
title: API Reference
publish: true
---

# API Reference

Crank.js is organized into several modules, each serving a specific purpose.

## Core Module

**`@b9g/crank`**

The core module contains the fundamental building blocks for creating and rendering elements.

- **Functions**: [createElement](/api/core/functions/createElement), [cloneElement](/api/core/functions/cloneElement), [isElement](/api/core/functions/isElement)
- **Classes**: [Element](/api/core/classes/Element), [Context](/api/core/classes/Context), [Renderer](/api/core/classes/Renderer)
- **Interfaces**: [RenderAdapter](/api/core/interfaces/RenderAdapter)
- **Types**: [Tag](/api/core/types/Tag), [Child](/api/core/types/Child), [Children](/api/core/types/Children), [Component](/api/core/types/Component), [ElementValue](/api/core/types/ElementValue)
- **Special Tags**: [Fragment](/api/core/special-tags/Fragment), [Portal](/api/core/special-tags/Portal), [Copy](/api/core/special-tags/Copy), [Text](/api/core/special-tags/Text), [Raw](/api/core/special-tags/Raw)

## Async Module

**`@b9g/crank/async`**

Utilities for handling asynchronous components and lazy loading.

- **Functions**: [lazy](/api/async/functions/lazy)
- **Components**: [Suspense](/api/async/components/Suspense), [SuspenseList](/api/async/components/SuspenseList)

## DOM Module

**`@b9g/crank/dom`**

Renderer for browser DOM environments.

- **Classes**: [DOMRenderer](/api/dom/classes/DOMRenderer)
- **Objects**: [adapter](/api/dom/objects/adapter), [renderer](/api/dom/objects/renderer)

## HTML Module

**`@b9g/crank/html`**

Renderer for generating HTML strings (server-side rendering).

- **Classes**: [HTMLRenderer](/api/html/classes/HTMLRenderer)
- **Objects**: [impl](/api/html/objects/impl), [renderer](/api/html/objects/renderer)

## Standalone Module

**`@b9g/crank/standalone`**

Template tag functions for writing JSX-like code without a build step.

- **Functions**: [jsx](/api/standalone/functions/jsx), [html](/api/standalone/functions/html)
