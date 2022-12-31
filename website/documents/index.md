Crank.js is the most “Just JavaScript” framework out there. A bold claim, but here some plain facts.
1. All Crank Components are “Just JavaScript” functions. But not just regular functions. Components can also be defined with async functions for working with promises, and generator functions for working with local state.
2. Crank supports JSX-based rendering. Don’t think JSX is “Just JavaScript” enough? Crank ships with a ``` jsx`` ``` tagged template function which does the basically the same thing.
3. Crank uses old-fashioned, battle-tested virtual DOM diffing to manage both stateful DOM nodes and lifecycle-based components in a predictable way.
4. Props are just named arguments. Computed properties are just assignments. State is just local variables. Lifecycles are for loops or while loops or even just yielding components in sequence.
5. Crank is the web framework that your messy side’s been dreaming of. Never “memoize” a callback ever again. Put side-effects anywhere you fucking want to. Await promises in any component, and await the results of those components with await.
6. Components execute predictably. Re-rendering is done explicitly. You do not need a PhD in Algebraic Effects to write a wrapper to `setInterval()`.

### A Simple Component
```jsx live
import {createElement} from "https://unpkg.com/@b9g/crank/crank";
import {renderer} from "https://unpkg.com/@b9g/crank/dom";

function Greeting({name = "World"}) {
  return <div>Hello {name}</div>;
}

renderer.render(<Greeting />, document.body);
```

### A Stateful Component
```jsx live
import {createElement} from "https://unpkg.com/@b9g/crank/crank";
import {renderer} from "https://unpkg.com/@b9g/crank/dom";

function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);
  try {
    for ({} of this) {
      yield <div>Time elapsed {seconds}s</div>;
    }
  } finally {
    clearInterval(interval);
  }
}

renderer.render(<Timer />, document.body);
```

### An Async Component
```jsx live
import {createElement} from "https://unpkg.com/@b9g/crank/crank";
import {renderer} from "https://unpkg.com/@b9g/crank/dom";

async function RandomQuote() {
  const res = await fetch("https://favqs.com/api/qotd");
  const {quote} = await res.json();
  return (
    <figure>
      <blockquote>{quote.body}</blockquote>
      <figcaption>- <a href={quote.url}>{quote.author}</a></figcaption>
    </figure>
  );
}

renderer.render(<RandomQuote />, document.body);
```

### A Loading Component
```jsx live
/** @jsx createElement */
import {createElement} from "https://unpkg.com/@b9g/crank/crank";
import {renderer} from "https://unpkg.com/@b9g/crank/dom";

async function LoadingIndicator() {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return <div>Fetching a good boy...</div>;
}

async function RandomDog({throttle = false}) {
  const res = await fetch("https://dog.ceo/api/breeds/image/random");
  const data = await res.json();
  if (throttle) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return (
    <img src={data.message} alt="A Random Dog" width="300" />
  );
}

async function *RandomDogLoader({throttle}) {
  for await ({throttle} of this) {
    yield <LoadingIndicator />;
    yield <RandomDog throttle={throttle} />;
  }
}

function *RandomDogApp() {
  let throttle = false;
  this.addEventListener("click", (ev) => {
    if (ev.target.tagName === "BUTTON") {
      throttle = !throttle;
      this.refresh();
    }
  });

  for ({} of this) {
    yield (
      <>
        <div>
          <button>Show me another dog.</button>
        </div>
        <RandomDogLoader throttle={throttle} />
      </>
    );
  }
}

renderer.render(<RandomDogApp />, document.body);
```
