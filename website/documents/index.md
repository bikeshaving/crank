Many web frameworks claim to be “Just JavaScript.” None have as strong a claim
as Crank. Here are the facts.
1. All components in Crank are “just” functions. But not just regular
	 functions. Components can also be defined with async functions for working
	 with promises, and generator functions for working with local state.

2. Crank supports JSX-based rendering. Don’t think JSX is “Just JavaScript”
	 enough? Crank ships with a ``` jsx`` ``` tagged template function which does
	 the basically the same thing.

3. Crank uses old-fashioned, battle-tested virtual DOM to manage stateful DOM
	 nodes and components in a predictable way.

4. Props are just named arguments. Computed props are just assignments. State
	 is just local variables. Lifecycles can be contained in while and for loops.

5. Crank is the framework you messy bitches have been dreaming of. Never
	 “memoize” a callback ever again. Put side-effects anywhere you fucking want.
	 Await promises in any component.

6. Components execute predictably. Re-rendering is done explicitly. You do not
	 need a PhD in Algebraic Effects to write a wrapper to `setInterval()`.

### Interactive Examples
```jsx live
import {createElement} from "@b9g/crank@beta";
import {renderer} from "@b9g/crank@beta/dom";

function Greeting({name = "World"}) {
  return <div>Hello {name}</div>;
}

renderer.render(<Greeting />, document.body);
```
