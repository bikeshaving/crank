# Crank.js
JSX-driven components with functions, promises and generators.

Crank is a new React-like library for building user interfaces. This is an early beta. A documentation website is coming soon as we dogfood the library.

Crank is available on [NPM](https://npmjs.org/@bikeshaving/crank) in the ESModule and CommonJS formats.

```
$ npm install @bikeshaving/crank
```

```jsx
/* @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

renderer.render(<div id="hello">Hello world</div>, document.body);
```

If your environment does not support ESModules (you’ll probably see a message like `SyntaxError: Unexpected token export`), you can import the CommonJS versions of the crank like so:

```jsx
/* @jsx createElement */
import {createElement} from "@bikeshaving/crank/cjs";
import {renderer} from "@bikeshaving/crank/cjs/dom";

renderer.render(<div id="hello">Hello world</div>, document.body);
```

## Key Examples

### A Simple Component
```jsx
function Greeting ({name}) {
  return (
    <div>Hello {name}</div>
  );
}
```

### A Stateful Component
```jsx
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
```

### An Async Component
```jsx
async function IPAddress () {
  const res = await fetch("https://api.ipify.org");
  const address = await res.text();
  return <div>Your IP Address: {address}</div>;
}
```

### A Suspending Component
```jsx
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
      <img src={data.message} width="250" />
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
        <button>Show me another dog.</button>
        <Suspense fallback={<div>Fetching a good boy…</div>}>
          <RandomDog throttle={throttle} />
        </Suspense>
      </Fragment>
    );
  }
}
```
