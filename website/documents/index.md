## About
Crank.js is a framework where components are defined with *Plain Old JavaScript Functions*. But not just regular functions! Components can also be defined with async functions for working with promises, and generator functions for working with local state.

Its API aims to be minimal and transparent. By relying on standard JavaScript control flow operators and data structures, and by making the process of rendering explicit, Crank.js helps developers write durable, bug-free applications with the latest and greatest libraries and APIs.

Rather than forcing developers to work with increasingly convoluted reactive solutions and bespoke templating languages, Crank.js uses the platform. It is a dedication to the web, to the promise of an accessible and inclusive medium for self-expression and commerce, built on the thesis that simpler code is how we’ll push the frontier.

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