Many web frameworks claim to be “just JavaScript.” Few have as strong a claim as Crank.

It starts with the question: if components are *just* functions, why can’t they be async and generator functions as well? Crank follows through on this idea, reimagining the component model as one which takes full advantage of promises and iterators.

The result is a simpler developer experience, where you spend less time writing framework integrations and more time writing vanilla JavaScript.

## Three reasons to choose Crank

### Reason #1: It’s declarative

Crank works with JSX. It uses tried-and-tested virtual DOM algorithms. Simple
components can be defined with functions which return elements.

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

Don’t think JSX is vanilla enough? Crank provides a tagged template function
which does roughly the same thing.

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

Crank uses generator functions to define stateful components. You store state in local variables, and `yield` rather than `return` to keep that state around.

```jsx live
import {renderer} from "@b9g/crank/dom";

function Greeting({name = "World"}) {
  return <p>Hello {name}.</p>;
}

function *CyclingName() {
  const names = ["Alice", "Bob", "Carol", "Dave"];
  let i = 0;
  while (true) {
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

  // The this of a Crank component is an iterable of props.
  for ({} of this) {
    // Welcome to the render loop.
    // Most generator components should use render loops even if they do not
    // use props.
    // The render loop provides useful behavior like preventing infinite loops
    // because of a forgotten yield.
    yield (
      <div>
        <p>Seconds: {seconds} second{seconds !== 1 && "s"}</p>
        <button onclick={toggleInterval}>
          {interval == null ? "Start timer" : "Stop timer"}
        </button>
        {" "}
        <button onclick={resetInterval}>Reset timer</button>
      </div>
    );
  }

  // You can even put cleanup code after the loop.
  clearInterval(interval);
}

renderer.render(<Timer />, document.body);
```

### Reason #3: It’s promise-friendly.

Any component can be made asynchronous with the `async` keyword. As it turns out, one of the nicest ways to use `fetch()` is to call it and `await` the result.

```jsx live
import {renderer} from "@b9g/crank/dom";

async function QuoteOfTheDay() {
  // Quotes API courtesy https://theysaidso.com
  const res = await fetch("https://quotes.rest/qod.json");
  const quote = (await res.json())["contents"]["quotes"][0];
  return (
    <figure>
      <blockquote>{quote.quote}</blockquote>
      <figcaption>
        — <a href={quote.permalink} target="_blank">{quote.author}</a>
      </figcaption>
    </figure>
  );
}

renderer.render(<QuoteOfTheDay />, document.body);
```

Async generator functions let you write components that are both async *AND* stateful. You can even race components to show temporary fallback states.

```jsx live
import {renderer} from "@b9g/crank/dom";

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
  await new Promise((r) => setTimeout(r, 1000));
  let count = 0;
  const interval = setInterval(() => {
    count++;
    this.refresh();
  }, 200);

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
  const res = await fetch("https://fakerapi.it/api/v1/credit_cards?_quantity=1");
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

async function *RandomCreditCard({throttle}) {
  for await ({throttle} of this) {
    yield <LoadingCreditCard />;
    yield <MockCreditCard throttle={throttle} />;
  }
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
        <RandomCreditCard throttle={throttle} />
        <div>
          <button onclick={() => this.refresh()}>
            Generate new card
          </button>
          {" "}
          <button onclick={toggleThrottle}>
            {throttle ? "Unthrottle" : "Throttle"} API
          </button>
        </div>
      </div>
    );
  }
}

renderer.render(<CreditCardGenerator />, document.body);
```
