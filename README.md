# Crank
## JSX-driven components with functions, promises and generators.

Crank is a JavaScript library for building user interfaces.
This is an early beta.

## Examples

### A Simple Component
```ts
function Hello ({name}) {
  return (
    <div>Hello {name}</div>
  );
}
```

### A Stateful Component
```ts
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
```ts
async function IPAddress () {
  const res = await fetch("https://api.ipify.org");
  const address = await res.text();
  return <div>Your IP Address: {address}</div>;
}
```

### A Loading Component
```ts
async function RandomDogImage ({throttle=false}) {
  if (throttle) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const res = await fetch("https://dog.ceo/api/breeds/image/random");
  console.log(res.ok);
  const data = await res.json();
  return (
    <a href={data.message}>
      <img src={data.message} width="250" />
    </a>
  );
}

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

function *RandomDogApp () {
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
        <button>Fetch a new dog</button>
        <Suspense fallback={<div>Fetching a good boy…</div>}>
          <RandomDogImage throttle={throttle} />
        </Suspense>
      </Fragment>
    );
  }
}
```
