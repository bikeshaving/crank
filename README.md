# Crank
## JSX-driven components with functions, promises and generators.

Crank is a JavaScript library for building user interfaces.
This is an early beta.

## Examples

### A Simple Component
Eventually, you’re going to want to re-use elements, in the form of components. Crank has no class-based component API, every component is just a function which produces elements.

```jsx
function Greeting ({name}) {
  return (
    <div>Hello {name}</div>
  );
}
```

`Greeting` is a simple component which takes a name as props, and returns an element with the name interpolated into a div. You can use this element by creating an element with the function `Greeting` as the tag, and a string for props.

```jsx
renderer.render(<Greeting name="Andrew" />, document.body);
```

### A Stateful Component
So far, the components we’ve seen have all been stateless, but eventually, you will want to write stateful components, to create forms and stuff.

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

### A Loading Component
```jsx
async function Fallback ({wait = 1000, children}) {
  await new Promise((resolve) => setTimeout(resolve, wait));
  return <Fragment>{children}</Fragment>;
}

async function *Suspense ({fallback, children}) {
  for await ({fallback, children} of this) {
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
