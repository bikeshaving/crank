---
title: Crank.js
description: "The Just JavaScript framework. Crank is a JavaScript / TypeScript library where you write components with functions, promises and generators."
---

## What is Crank?

Crank is a JavaScript / TypeScript library for building websites and applications. It is a framework where components are defined with plain old functions, including async and generator functions, which `yield` and `return` JSX elements.

## Why is Crank “Just JavaScript?”

Many web frameworks claim to be “just JavaScript.” Few have as strong a claim as Crank.

It starts with the idea that you can write components with *all* of JavaScript’s built-in function syntaxes.

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);

  for ({} of this) {
    yield <p>{seconds} second{seconds !== 1 && "s"}</p>;
  }

  clearInterval(interval);
}

renderer.render(<Timer />, document.body);

async function Definition({word}) {
  // API courtesy https://dictionaryapi.dev
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
  const data = await res.json();
  if (!Array.isArray(data)) {
    return <p>No definition found for {word}</p>;
  }

  const {phonetic, meanings} = data[0];
  const {partOfSpeech, definitions} = meanings[0];
  const {definition} = definitions[0];
  return <>
    <p>{word} <code>{phonetic}</code></p>
    <p><b>{partOfSpeech}.</b> {definition}</p>
    {/*<pre>{JSON.stringify(data, null, 4)}</pre>*/}
  </>;
}

// TODO: Uncomment me.
//renderer.render(<Definition word="framework" />, document.body);
```

Crank components work like normal JavaScript, using standard control-flow. Props can be destructured. Promises can be awaited. Updates can be iterated. State can be held in scope.

The result is a simpler developer experience, where you spend less time writing framework integrations and more time writing vanilla JavaScript.

## Three reasons to choose Crank

### Reason #1: It’s declarative

Crank works with JSX. It uses tried-and-tested virtual DOM algorithms. Simple components can be defined with functions which return elements.

```jsx live
import {renderer} from "@b9g/crank/dom";

function Greeting({name = "World"}) {
  return <p>Hello {name}.</p>;
}

function RandomName() {
  const names = ["Alice", "Bob", "Carol", "Dave"];
  const randomName = names[Math.floor(Math.random() * names.length)];

  // TODO: Uncomment the button.
  return (
    <div>
      <Greeting name={randomName} />
      {/*
      <button onclick={() => this.refresh()}>Random name</button>
      */}
    </div>
  );
}

renderer.render(<RandomName />, document.body);
```

Don’t think JSX is vanilla enough? Crank provides a tagged template function which does roughly the same thing.

```jsx live
import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/dom";

function Star({cx, cy, r=50, ir, p=5, fill="red"}) {
  cx = parseFloat(cx);
  cy = parseFloat(cy);
  r == parseFloat(r);
  ir = ir == null ? r * 0.4 : parseFloat(ir);
  p = parseFloat(p);
  const points = [];
  const angle = Math.PI / p;
  for (let i = 0, a = Math.PI / 2; i < p * 2; i++, a += angle) {
    const x = cx + Math.cos(a) * (i % 2 === 0 ? r : ir);
    const y = cy - Math.sin(a) * (i % 2 === 0 ? r : ir);
    points.push([x, y]);
  }

  return jsx`
    <polygon points=${points} fill=${fill} />
  `;
}

function Stars({width, height}) {
  return jsx`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 ${width} ${height}"
      width=${width}
      height=${height}
      style="border: 1px solid currentcolor"
    >
      <!--
        Refactoring this to be less repetitive has been left
        as an exercise for the reader.
      -->
      <${Star} cx="70" cy="70" r="50" fill="red" />
      <${Star} cx="80" cy="80" r="50" fill="orange" />
      <${Star} cx="90" cy="90" r="50" fill="yellow" />
      <${Star} cx="100" cy="100" r="50" fill="green" />
      <${Star} cx="110" cy="110" r="50" fill="dodgerblue" />
      <${Star} cx="120" cy="120" r="50" fill="indigo" />
      <${Star}
        cx="130"
        cy="130"
        r="50"
        fill="purple"
        p=${6}
      />
    </svg>
  `;
}

const inspirationalWords = [
  "I believe in you.",
  "You are great.",
  "Get back to work.",
  "We got this.",
];

function RandomInspirationalWords() {
  return jsx`
    <p>${inspirationalWords[Math.floor(Math.random() * inspirationalWords.length)]}</p>
  `;
}

renderer.render(jsx`
  <div
    class="motivational-poster"
    style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    "
  >
    <${Stars} width=${200} height=${200} />
    <${RandomInspirationalWords} />
  </div>
`, document.body);
```

### Reason #2: It’s predictable

Crank uses generator functions to define stateful components. You store state in local variables, and `yield` rather than `return` to keep it around.

```jsx live
import {renderer} from "@b9g/crank/dom";

function Greeting({name = "World"}) {
  return <p>Hello {name}.</p>;
}

function *CyclingName() {
  const names = ["Alice", "Bob", "Carol", "Dave"];
  let i = 0;
  for ({} of this) {
    yield (
      <div>
        <Greeting name={names[i % names.length]} />
        <button onclick={() => this.refresh()}>Cycle name</button>
      </div>
    )

    i++;
  }
}

renderer.render(<CyclingName />, document.body);
```

Components rerender based on explicit `refresh()` calls. This level of precision means you can be as messy as you need to be.

Never memoize a callback ever again.

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Timer() {
  let interval = null;
  let seconds = 0;
  const startInterval = () => {
    interval = setInterval(() => {
      seconds++;
      this.refresh();
    }, 1000);
  };

  const toggleInterval = () => {
    if (interval == null) {
      startInterval();
    } else {
      clearInterval(interval);
      interval = null;
    }

    this.refresh();
  };

  const resetInterval = () => {
    seconds = 0;
    clearInterval(interval);
    interval = null;
    this.refresh();
  };

  // The context passed to a Crank component is an iterable of props.
  for ({} of this) {
    // Welcome to the render loop.
    // Most generator components should use render loops even if they do not
    // use props.
    // The render loop provides useful behavior like preventing infinite loops
    // because of a forgotten yield.
    yield (
      <div>
        <p>{seconds} second{seconds !== 1 && "s"}</p>
        <button onclick={toggleInterval}>
          {interval == null ? "Start timer" : "Stop timer"}
        </button>
        {" "}
        <button onclick={resetInterval}>Reset timer</button>
      </div>
    );
  }

  // You can place cleanup code after the loop.
  clearInterval(interval);
}

renderer.render(<Timer />, document.body);
```

### Reason #3: It’s promise-friendly.

Any component can be made asynchronous with the `async` keyword. This means you can await `fetch()` directly in a component, client or server.

```jsx live
import {renderer} from "@b9g/crank/dom";

async function Definition({word}) {
  // API courtesy https://dictionaryapi.dev
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
  const data = await res.json();
  if (!Array.isArray(data)) {
    return (
      <div>No definition found for {word}</div>
    );
  }

  const {phonetic, meanings} = data[0];
  const {partOfSpeech, definitions} = meanings[0];
  const {definition} = definitions[0];
  return (
    <div>
      <p>{word} <code>{phonetic}</code></p>
      <p><b>{partOfSpeech}.</b> {definition}</p>
    </div>
  );
}

function *Dictionary() {
  let word = "";
  const onsubmit = (ev) => {
    ev.preventDefault();
    const formData = new FormData(ev.target);
    const word1 = formData.get("word");
    if (word1.trim()) {
      word = word1;
      this.refresh();
    }
  };

  for ({} of this) {
    yield (
      <>
        <form
          action=""
          method="get"
          onsubmit={onsubmit}
          style="margin-bottom: 15px"
        >
          <div style="margin-bottom: 15px">
            <label for="name">Define:</label>{" "}
            <input type="text" name="word" id="word" required />
          </div>
          <div>
            <input type="submit" value="Search" />
          </div>
        </form>
        {word && <Definition word={word} />}
      </>
    );
  }
}

renderer.render(<Dictionary />, document.body);
```

Async generator functions let you write components that are both async *and* stateful. Crank uses promises wherever they makes sense, and has a rich async execution model which allows you to do things like racing components to display loading states.

```jsx live
import {renderer} from "@b9g/crank/dom";
import {Suspense} from "@b9g/crank/async";
function formatNumber(number, type) {
  number = number.padEnd(16, "0");
  if (type === "American Express") {
    return [number.slice(0, 4), number.slice(4, 10), number.slice(10, 15)].join(" ");
  }

  return [
    number.slice(0, 4),
    number.slice(4, 8),
    number.slice(8, 12),
    number.slice(12),
  ].join(" ");
}

function CreditCard({type, expiration, number, owner}) {
  return (
    <div style="
      padding: 10px;
      margin: 10px 0;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(2, 1fr);
      border: 1px solid currentcolor;
      border-radius: 10px;
    ">
      <pre>{formatNumber(number, type)}</pre>
      <pre>Exp: {expiration}</pre>

      <pre>{type}</pre>
      <pre>{owner}</pre>
    </div>
  );
}

async function *LoadingCreditCard() {
  let count = 0;
  const interval = setInterval(() => {
    count++;
    this.refresh();
  }, 250);

  this.cleanup(() => clearInterval(interval));

  for ({} of this) {
    yield (
      <CreditCard
        number={"*".repeat(count) + "?".repeat(Math.max(0, 16 - count))}
        type={"Loading" + ".".repeat(count % 4)}
        owner="__ __"
        expiration="__/__"
      />
    );
  }
}

async function MockCreditCard({throttle}) {
  if (throttle) {
    await new Promise((r) => setTimeout(r, 2000));
  }
  // Mock credit card data courtesy https://fakerapi.it/en
  const res = await fetch("https://fakerapi.it/api/v2/creditCards?_quantity=1");
  if (res.status === 429) {
    return (
      <marquee>Too many requests. Please use free APIs responsibly.</marquee>
    );
  }
  const {data: [card]} = await res.json();
  return (
    <CreditCard
      number={card.number}
      type={card.type}
      owner={card.owner}
      expiration={card.expiration}
    />
  );
}

function RandomCreditCard({throttle}) {
  return (
    <Suspense fallback={<LoadingCreditCard />}>
      <MockCreditCard throttle={throttle} />
    </Suspense>
  );
}

function *CreditCardGenerator() {
  let throttle = false;
  const toggleThrottle = () => {
    throttle = !throttle;
    // TODO: A nicer user behavior would be to not generate a new card
    // when toggling the throttle.
    this.refresh();
  };

  for ({} of this) {
    yield (
      <div>
        <div>
          <button onclick={() => this.refresh()}>
            Generate new card
          </button>
          {" "}
          <button onclick={toggleThrottle}>
            {throttle ? "Unthrottle" : "Throttle"} API
          </button>
        </div>
        <RandomCreditCard throttle={throttle} />
      </div>
    );
  }
}

renderer.render(<CreditCardGenerator />, document.body);
```
