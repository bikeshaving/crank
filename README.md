# Crank
## JSX-driven components with functions, promises and generators.

Crank is a JavaScript library for building user interfaces.
This is an early beta.

## Examples

### A Simple Component
```ts
function HelloMessage({name}) {
  return <div>Hello {name}</div>;
}
```

### A Stateful Component
```ts
function* Timer() {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);

  try {
    while (true) {
      yield (<div>Seconds: {seconds}</div>);
    }
  } finally {
    clearInterval(interval);
  }
}
```

### An Async Component
```ts
async function IPAddress() {
  const res = await fetch("https://api.ipify.org");
  const address = await res.text();
  return <div>Your IP Address: {address}</div>;
}
```

### A Loading Component
```ts
async function Loading({message = "Loading…", wait = 1000}) {
  await new Promise((resolve) => setTimeout(resolve, wait));
  return message;
}

async function* DogImage() {
  yield null;
  for await (const _ of this) {
    yield (<Loading message="Fetching a dog…" />);
    const res = await fetch("https://dog.ceo/api/breeds/image/random");
    const data = await res.json();
    if (Math.random() > 0.5) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    yield (
      <figure>
        <img src={data.message} height="400" />
        <figcaption>
          <a href={data.message}>{data.message}</a>
        </figcaption>
      </figure>
    );
  }
}

function RandomDogApp() {
  this.addEventListener("click", (ev) => {
    if (ev.target.className === "fetch") {
      this.refresh();
    }
  });

  return (
    <div>
      <div>
        <button class="fetch">Fetch!</button>
      </div>
      <DogImage />
    </div>
  );
}
```
