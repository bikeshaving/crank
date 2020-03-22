---
title: Getting Started
---

## Installation
Crank is available on [NPM](https://npmjs.org/@bikeshaving/crank) in the ESModule and CommonJS formats.

```shell
$ npm install @bikeshaving/crank
```

```jsx
/* @jsx createElement */
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
/** @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

function Greeting ({name = "World"}) {
  return (
    <div>Hello {name}</div>
  );
}

renderer.render(<Greeting />, document.getElementById("app"));
```

[Try on CodeSandbox](https://codesandbox.io/s/a-simple-crank-component-gnknz)

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
/* @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

async function Fallback ({wait = 1000, children}) {
  await new Promise((resolve) => setTimeout(resolve, wait));
  return <Fragment>{children}</Fragment>;
}

async function *Suspense () {
  for await (const {fallback, children} of this) {
    yield <Fallback>{fallback}</Fallback>;
    yield <Fragment>{children}</Fragment>;
  }
}

async function RandomDog ({throttle=false}) {
  if (throttle) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const res = await fetch("https://dog.ceo/api/breeds/image/random");
  const data = await res.json();
  return (
    <a href={data.message}>
      <img src={data.message} alt="A Random Dog" width="300" />
    </a>
  );
}

function *RandomDogs () {
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
        <Suspense fallback={<div>Fetching a good boy…</div>}>
          <RandomDog throttle={throttle} />
        </Suspense>
      </Fragment>
    );
  }
}

renderer.render(<RandomDogs />, document.getElementById("app"));
```

[Try on CodeSandbox](https://codesandbox.io/s/a-loading-crank-component-pci9d)
