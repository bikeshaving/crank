# Crank.js
### The most “Just JavaScript” web framework.

Crank.js is a framework where components are defined with *Plain Old JavaScript Functions*. But not just regular functions: components can also be defined with async functions for working with promises, and generator functions for working with local state. Its API aims to be minimal and transparent. By relying on standard JavaScript control flow operators and data structures, and by making the process of rendering explicit rather than reactive, Crank.js helps developers write durable, bug-free applications with the latest and greatest libraries and APIs.

## Getting Started

The documentation for Crank.js is available at [crank.js.org](https://crank.js.org). To learn about the initial motivations for its creation, you can read the [introductory blog post](https://crank.js.org/blog/introducing-crank).

Crank.js is published on NPM under the `@b9g` organization (short for “b**ikeshavin**g”).

```shell
$ npm install @b9g/crank
```

### Key Examples

#### A Simple Component

```jsx
/** @jsx createElement */
import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

function Greeting({name = "World"}) {
  return (
    <div>Hello {name}</div>
  );
}

renderer.render(<Greeting />, document.body);
```

#### A Stateful Component

```jsx
/** @jsx createElement */
import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);
  try {
    while (true) {
      yield <div>Seconds: {seconds}</div>;
    }
  } finally {
    clearInterval(interval);
  }
}

renderer.render(<Timer />, document.body);
```

#### An Async Component

```jsx
/** @jsx createElement */
import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

async function QuoteOfTheDay() {
  const res = await fetch("https://favqs.com/api/qotd");
  const {quote} = await res.json();
  return (
    <p>
      “{quote.body}” – <a href={quote.url}>{quote.author}</a>
    </p>
  );
}

renderer.render(<QuoteOfTheDay />, document.body);
```

### A Loading Component

```jsx
/** @jsx createElement */
import {createElement, Fragment} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

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
    <a href={data.message}>
      <img src={data.message} alt="A Random Dog" width="300" />
    </a>
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

  while (true) {
    yield (
      <Fragment>
        <div>
          <button>Show me another dog.</button>
        </div>
        <RandomDogLoader throttle={throttle} />
      </Fragment>
    );
  }
}

renderer.render(<RandomDogApp />, document.body);
```
