---
title: Getting Started
---

## Installation
Crank is available on [NPM](https://npmjs.org/@bikeshaving/crank) in the ESModule and CommonJS formats.

```shell
$ npm install @bikeshaving/crank
```

```jsx
/** @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

renderer.render(<div id="hello">Hello world</div>, document.body);
```

If your environment does not support ESModules (you may see a message like `SyntaxError: Unexpected token export`), you can import the CommonJS versions of the library under the `cjs` directory.

```jsx
/** @jsx createElement */
import {createElement} from "@bikeshaving/crank/cjs";
import {renderer} from "@bikeshaving/crank/cjs/dom";

renderer.render(<div id="hello">Hello world</div>, document.body);
```

## Key Examples
### A Simple Component
```jsx live
/** @jsx createElement */
import {createElement} from "https://unpkg.com/@b9g/crank/crank";
import {renderer} from "https://unpkg.com/@b9g/crank/dom";

function Greeting({name = "World"}) {
  return (
    createElement("div", null, `Hello ${name}`)
  );
}

renderer.render(createElement(Greeting), document.body);
```

### A Stateful Component
```jsx live
/** @jsx createElement */
import {createElement as h} from "https://unpkg.com/@b9g/crank/crank";
import {renderer} from "https://unpkg.com/@b9g/crank/dom";

function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);
  try {
    while (true) {
      yield h("div", null, `Seconds: ${seconds}`);
    }
  } finally {
    clearInterval(interval);
  }
}

renderer.render(h(Timer), document.body);
```

### An Async Component
```jsx live
/** @jsx createElement */
import {createElement as h} from "https://unpkg.com/@b9g/crank/crank";
import {renderer} from "https://unpkg.com/@b9g/crank/dom";

async function QuoteOfTheDay() {
  const res = await fetch("https://favqs.com/api/qotd");
  const {quote} = await res.json();
  return h("p", {onclick: () => this.refresh()} ,
    `“${quote.body}” – `,
    h("a", {href: quote.url}, quote.author),
  );
}

renderer.render(h(QuoteOfTheDay), document.body);
```

### A Loading Component
```jsx live
/** @jsx createElement */
import {createElement as h, Fragment} from "https://unpkg.com/@b9g/crank/crank";
import {renderer} from "https://unpkg.com/@b9g/crank/dom";

async function LoadingIndicator() {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return h("div", null, "Fetching a good boy...");
}

async function RandomDog({throttle = false}) {
  const res = await fetch("https://dog.ceo/api/breeds/image/random");
  const data = await res.json();
  if (throttle) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return h("a", {href: data.message},
    h("img", {src: data.message, alt: "A Random Dog", width: "300"}),
  );
}

async function *RandomDogLoader({throttle}) {
  for await ({throttle} of this) {
    yield h(LoadingIndicator);
    yield h(RandomDog, {throttle});
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
    yield h(Fragment, null,
      h("div", null,
        h("button", null, "Show me another dog."),
      ),
      h(RandomDogLoader, {throttle})
    );
  }
}

renderer.render(h(RandomDogApp), document.body);
```
