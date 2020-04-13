# Crank.js
A JavaScript framework for writing JSX-driven components with functions, generators and promises.

I wrote a blog post describing the motivations and journey behind making Crank [here](https://github.com/brainkim/crank/blob/master/docs/blog/introducing-crank.md). Crank is in an early beta, and some APIs may be changed.

A documentation is in the works, where we dogfood Crank. In the meantime you can access the docs as markdown files in the docs directory.

## Features
### JSX-based elements
Crank uses the same JSX syntax and element diffing algorithm popularized by React, so you can write declarative code which looks like HTML directly in your JavaScript. The portability of elements means you can reuse the same code to render DOM nodes on the client and HTML strings on the server.

### Components as functions and generators
Crank uses functions and generators for components exclusively. No fancy classes, hooks, proxies or template languages are needed, and you can take advantage of the natural lifecycle of generators to write stateful setup, update and teardown logic all in the same scope.

### Promises today
Crank provides first-class support for promises by allowing components to be defined as async functions and generators. You can `await` the rendering of async components just like any other async function, and you can even race renderings to create user interfaces with deferred loading states.

## Getting Started
Crank is available on [NPM](https://npmjs.org/@bikeshaving/crank) in the ESModule and CommonJS formats.

```
$ npm install @bikeshaving/crank
```

```jsx
/** @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

renderer.render(<div id="hello">Hello world</div>, document.body);
```

If your environment does not support ESModules (you’ll probably see a message like `SyntaxError: Unexpected token export`), you can import the CommonJS versions of the library like so:

```jsx
/** @jsx createElement */
import {createElement} from "@bikeshaving/crank/cjs";
import {renderer} from "@bikeshaving/crank/cjs/dom";

renderer.render(<div id="hello">Hello world</div>, document.body);
```

## Key Examples
### A Simple Component
```jsx
/* @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

function Greeting ({name = "World"}) {
  return (
    <div>Hello {name}</div>
  );
}

renderer.render(<Greeting />, document.getElementById("app"));
```

[Try on CodeSandbox](https://codesandbox.io/s/a-simple-crank-component-mhciu)

### A Stateful Component
```jsx
/** @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

function *Timer () {
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

renderer.render(<Timer />, document.getElementById("app"));
```

[Try on CodeSandbox](https://codesandbox.io/s/a-stateful-crank-component-hh8zx)

### An Async Component
```jsx
/** @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

async function IPAddress () {
  const res = await fetch("https://api.ipify.org");
  const address = await res.text();
  return <div>Your IP Address: {address}</div>;
}

renderer.render(<IPAddress />, document.getElementById("app"));
```

[Try on CodeSandbox](https://codesandbox.io/s/an-async-crank-component-ru02q)

### A Loading Component

```jsx
/** @jsx createElement */
import {createElement, Fragment} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

async function Fallback({wait = 1000, children}) {
  await new Promise(resolve => setTimeout(resolve, wait));
  return <Fragment>{children}</Fragment>;
}

async function RandomDog({throttle = false}) {
  if (throttle) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const res = await fetch("https://dog.ceo/api/breeds/image/random");
  const data = await res.json();
  return (
    <a href={data.message}>
      <img src={data.message} alt="A Random Dog" width="300" />
    </a>
  );
}

async function* RandomDogLoader({throttle}) {
  for await ({throttle} of this) {
    yield (
      <Fallback>
        <div>Fetching a good boy...</div>
      </Fallback>
    );
    yield <RandomDog throttle={throttle} />;
  }
}

function* RandomDogs() {
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

renderer.render(<RandomDogs />, document.body);
```

[Try on CodeSandbox](https://codesandbox.io/s/a-loading-crank-component-pci9d)
