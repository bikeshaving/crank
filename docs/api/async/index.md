---
title: "@b9g/crank/async"
publish: true
---

# @b9g/crank/async

Utilities for handling asynchronous components and lazy loading.

## Installation

```bash
npm install @b9g/crank
```

```ts
import {lazy, Suspense, SuspenseList} from "@b9g/crank/async";
```

## Functions

- [lazy](/api/async/functions/lazy) - Create lazy-loaded components

## Components

- [Suspense](/api/async/components/Suspense) - Display fallback while children load
- [SuspenseList](/api/async/components/SuspenseList) - Coordinate reveal order of Suspense boundaries
