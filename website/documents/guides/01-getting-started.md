---
title: Getting Started
---
## Key Examples
### A Simple Component
```jsx live
import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom.js";

function Greeting({name = "World"}) {
  return <div>Hello {name}</div>;
}

renderer.render(<Greeting />, document.body);
```
