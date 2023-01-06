Many frameworks claim to be “Just JavaScript.” Few have as strong a claim as
Crank.

### Components are functions.
Crank components are plain old JavaScript functions. Props are parameters.
Computed props are assignments. Async components are async functions, and
generator functions provide a scope for state to be defined with local
variables.

```jsx live
import {createElement} from "@b9g/crank@beta";
import {renderer} from "@b9g/crank@beta/dom";

function Greeting({name = "World"}) {
  return <div>Hello {name}</div>;
}

renderer.render(<Greeting />, document.body);
```

It’s built on JSX and the diffing algorithm made popularized by React. Don’t
think JSX is vanilla enough? Crank ships with a tagged template function which
does basically the same thing.

### It’s declarative.

Crank uses the same battle-tested virtual DOM algorithms popularized by React
to manage stateful rendering. There are built-in renderers for manipulating DOM
nodes and producing HTML. There’s also an API for writing custom renderers for
environments like Three.js.

### It’s predictable.

Crank has a well-defined execution model so you can get messy. Put side-effects
wherever you want. Never “memoize” a callback ever again.
