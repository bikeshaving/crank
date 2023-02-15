Many frameworks claim to be “just JavaScript.” Few have as strong a claim as
Crank.

It starts with the question: if components are just functions, why can’t we
define them with async and generator functions as well?

## Three Reasons to choose Crank

### Reason #1: It’s declarative

Crank works with JSX. It uses tried-and-tested virtual DOM algorithms for
declarative renderering. Simple components can be defined with functions which return JSX.

```jsx live
import {renderer} from "@b9g/crank/dom";

function Greeting({name = "World"}) {
  return <div>Hello {name}.</div>;
}

function App() {
  const names = ["Alice", "Bob", "Carol", "Dave"];
  const randomName = names[Math.floor(Math.random() * names.length)];
  return (
    <>
      <Greeting name={randomName} />
      {/* TODO: Uncomment me!
      <button onclick={() => this.refresh()}>New name</button>
      */}
    </>
  );
}

renderer.render(<App />, document.body);
```

Don’t think JSX is vanilla enough? Crank provides a tagged template function
which does basically the same thing.

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
      viewBox="0 0 ${width} ${height}"
      width="${width}px"
      height="${height}px"
    >
      <!--
        Refactoring this to be less repetitive has been left
        as an exercise for the reader.
      -->
      <${Star} cx="70" cy="70" r="50" fill="red" />
      <${Star} cx="80" cy="80" r="50" fill="orange" />
      <${Star} cx="90" cy="90" r="50" fill="yellow" />
      <${Star} cx="100" cy="100" r="50" fill="green" />
      <${Star} cx="110" cy="110" r="50" fill="blue" />
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

renderer.render(jsx`
  <${Stars} width=${200} height=${200} />
`, document.body);
```

### Reason #2: It’s predictable

Crank uses generator functions to define stateful components. Local variables
can be used to store local state, and components rerender based on explicit
`refresh()` calls.

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Timer() {
  let interval = null;
  let seconds = 0;
  const ontoggle = () => {
    if (interval == null) {
      interval = setInterval(() => {
        seconds++;
        this.refresh();
      }, 1000);
    } else {
      clearInterval(interval);
      interval = null;
    }

    this.refresh();
  };

  const onreset = () => {
    seconds = 0;
    this.refresh();
  };

  for ({} of this) {
    yield (
      <div>
        <div>
          Seconds: {seconds} second{seconds !== 1 && "s"}
        </div>
        <button onclick={ontoggle}>
          {interval == null ? "Start timer" : "Stop timer"}
        </button>
        <button onclick={onreset}>Reset timer</button>
      </div>
    );
  }

  // cleanup code can go after the loop.
  clearInterval(interval);
}

renderer.render(<Timer />, document.body);
```

This level of precision means that you can put side-effects wherever you want.
Never “memoize” a callback ever again.

```jsx live
import {renderer} from "@b9g/crank/dom";

const r = () => Math.floor(Math.random() * 256);
const randomColorCSS = () => `rgb(${r()}, ${r()}, ${r()})`;

function Box({color=randomColorCSS(), size=1, children}) {
  return (
    <div style={`
      width: ${100 * size}%;
      aspect-ratio: 1 / 1;
      display: flex;
      justify-content: center;
      align-items: center;
      border: 1px solid ${color};
    `}>
      {children}
    </div>
  );
}

function *ConcentricBoxes() {
  const colors = Array.from({length: 100}, () => randomColorCSS());

  // TODO: Uncomment me!
  /*
  const interval = setInterval(() => {
    // should have the effect of shifting colors inward
    colors.unshift(colors.pop());
    this.refresh();
  }, 1000);

  this.cleanup(() => clearInterval(interval));
  */

  for ({} of this) {
    yield (
      <div style="width: 100%;">
        <Box color={colors[0]}>
          <Box color={colors[1]} size={0.9}>
            <Box color={colors[2]} size={0.8}>
              <Box color={colors[3]} size={0.7}>
                <marquee>That’s a lot of boxes.</marquee>
              </Box>
            </Box>
          </Box>
        </Box>
      </div>
    );
  }
}

renderer.render(<ConcentricBoxes />, document.body);
```

### Reason #3: It’s promise-friendly.

Any component can be made asynchronous with the `async` keyword. As it turns
out, the nicest way to use `fetch()` is to call the function and await its
result.

```jsx live
import {renderer} from "@b9g/crank/dom";

async function QuoteOfTheDay() {
  // Quotes API courtesy https://theysaidso.com
  const res = await fetch("https://quotes.rest/qod.json");
  const quote = (await res.json())["contents"]["quotes"][0];
  return (
    <figure>
      <blockquote>{quote.quote}</blockquote>
      <figcaption>— <a href={quote.permalink}>{quote.author}</a></figcaption>
    </figure>
  );
}

renderer.render(<QuoteOfTheDay />, document.body);
```

Crank 

```jsx live
import {renderer} from "@b9g/crank/dom";

function formatNumber(number, type) {
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
    <div style="padding: 10px; border: 1px solid currentcolor; border-radius: 10px;">
      <div style="display: flex; justify-content: space-between;">
        <div>{formatNumber(number, type)}</div>
        <div>{type}</div>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <div>{owner}</div>
        <div>Exp: {expiration}</div>
      </div>
    </div>
  );
}

async function FakeCreditCard() {
  // Mock credit card data courtesy https://fakerapi.it/en
  const res = await fetch("https://fakerapi.it/api/v1/credit_cards?_quantity=1");
  if (res.status === 429) {
    return (
      <marquee>Too many requests. Please use free APIs responsibly.</marquee>
    );
  }
  const {data: [card]} = await res.json();
  return (
    <>
      <button
        onclick={() => this.refresh()}
      >Generate new card</button>
      <CreditCard
        number={card.number}
        type={card.type}
        owner={card.owner}
        expiration={card.expiration}
      />
    </>
  );
}

renderer.render(<FakeCreditCard />, document.body);
```
