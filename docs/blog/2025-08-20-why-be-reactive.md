---
title: Why Be Reactive?
---

I was pleasantly surprised by the warm reception to Crank back when I first released it. A pleasant tweet from a React core team member, a rush of GitHub stars, and positive conversations on Reddit and Hacker News. Unfortunately, the intervening months and years are a great case study in how to squander a JavaScript hype cycle, and today Crank isn’t used very much.

Nevertheless, I’ve continued to find myself happy to work on Crank over the years, performing both basic and advanced maintenance tasks like ironing out embarrassing bugs, iterating on API design, and improving its runtime performance. However, I found the hardest task not to be technical but social: how do I convince developers to take the big step of adopting a new framework for their applications?

One of the pitches I’ve tried is that Crank is the most “Just JavaScript” framework out there. Components are functions, including async and generator functions, so you can await promises directly in components, and define state as local variables. Intuitively, this feels JavaScript-y. I even went through the extra effort of writing a template tag to appease those people who like to make the objection that JSX is not JavaScript. But was this convincing enough on its own?

As I’ve used Crank over the years, I realized that I had a better, though perhaps unorthodox, pitch: Crank isn’t “reactive” by any commonly held definition of “reactive,” and could even be further described as a “non-reactive” framework. It’s an unorthodox idea because almost every other web framework advertises itself as reactive, to the extent that frameworks are compared on the basis of their reactive abstractions. Most frameworks today (React, Vue, Svelte, Solid, etc.) are built around reactive primitives: signals, stores, observables, etc. Components rerender automatically in response to the framework’s chosen reactive abstraction, so much so that to not ship a reactive abstraction is to not have a complete framework. So, why would I go through the trouble of writing a non-reactive framework, let alone thinking that this was a selling point? 

I worry about being too abstract, so let me provide concrete definitions and code examples. We can define reactivity in the context of web frameworks as a feature where the framework updates its *views* when some associated *state* changes, however you define “view” and “state,” such that the two stay in sync. Even by this most general of definitions, the early releases of Crank were not reactive. For instance, here is how we defined a timer in earlier versions of Crank:

```jsx
function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);

  try {
    for ({} of this) {
      yield <div>{seconds}</div>;
    }
  } finally {
    clearInterval(interval);
  }
}
```

In the Timer component, the sole piece of state is the variable `seconds`, and when it is incremented, we have to separately call the utility method `refresh()` to actually update the view. When I first released Crank, many people saw code like this and balked. “Aha,” declared reactivity lovers. “Isn’t it a flaw that you can update a component’s local state but forget to call the `refresh()` method? Isn’t this a foot-gun”?

It’s true. As the first Crank user, I was also victim to this bug, forgetting to call refresh() after updating some state. But I refused to believe like some, that this meant I needed a reactive abstraction. Luckily, I recently realized that we can solve this problem by allowing a callback to be passed to `refresh()`, and made it a last minute addition to the 0.7 API.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => this.refresh(() => seconds++), 1000);
  for ({} of this) {
    yield <div>{seconds}</div>;
  }

  // New in 0.5. for...of loops naturally return when the component is about to unmount
  clearInterval(interval);
}

renderer.render(<Timer />, document.body);
```

Note that you no longer have to wrap `for...of` loops in a `try`/`finally`, another subtle quality of life improvement made in [0.5](https://github.com/bikeshaving/crank/blob/main/CHANGELOG.md#050---2023-02-01).

By having the convention where you put state changes in `refresh()` callbacks, you both make it impossible to forget to call `refresh()` and declaratively identify the code in the callback as intending to cause a re-render. This is one of those ideas that I wish I came up with sooner. As a matter of fact, it came to by Claude Code, who hallucinated the API while I was berating for generating the narstiest React-hook inspired Crank code in some documentation. I’m grateful to Claude for imagining the API, and embarassed that I didn’t discover it sooner.

## Bug severity and the pit of success

Nevertheless, even with the refresh() callback API, I can imagine objections to the generator lifecycle. Surely, there might be situations where state is not updated correctly, or developers might still call refresh() at the wrong time, or forget to batch multiple state changes together. Why not just use a reactive abstraction that handles all of this automatically?

To understand why I don’t think non-reactivity indicates flawed design, we have to take a step back and consider the potential severity of this sort of bug. We can evaluate the “severity” of a kind of bug by asking the following two questions: 1. Is this kind of bug easy to spot? and 2. Is this kind of bug easy to fix? These two questions determine if a bug will make it to your end users, and how long they will be tormented by that bug.  For Crank, the answers to both these questions is yes. These bugs are easy to spot because you immediately notice when your app hasn’t updated, and they’re easy to fix because you just add a `refresh()` call in the lines after the data updates you made, so much so that it eventually becomes muscle memory.  The refresh callback even solves the batching concern - multiple state updates in one callback naturally batch into one render.

But here's where it gets interesting: when you choose explicit refresh, you eliminate entire categories of bugs that plague reactive frameworks. Let me apply this same severity heuristic to Crank's main competitors - Solid, Vue, and Svelte - to show you what I mean.

## Reactive gotchas

More generally, reactive abstractions.

Another bug you eliminate is “losing reactivity” bugs. Consider these notorious examples from Solid.js.

```tsx
import { render } from "solid-js/web";
import { createSignal } from "solid-js";

// ❌ Wrong: Destructuring props in function parameters
function BrokenDisplay1({seconds}: {seconds: number}) {
  return <div>{seconds} second{seconds === 1 ? "" : "s"} elapsed</div>;
}

// ❌ Also wrong: Computing derived values outside of reactive context
function BrokenDisplay2(props: {seconds: number}) {
  const minutes = props.seconds / 60;
  return (
    <div>
      <span>{props.seconds} second{props.seconds === 1 ? "" : "s"} elapsed</span>
      {" "}
      <span>({minutes.toFixed(2)} minutes)</span>
    </div>
  );
}

// ✅ Right: Accessing props directly in JSX
function WorkingDisplay1(props: {seconds: number}) {
  return <div>{props.seconds} second{props.seconds === 1 ? "" : "s"} elapsed</div>;
}

// ✅ Also right: Computing derived values in a callback
function WorkingDisplay2(props: {seconds: number}) {
  const minutes = () => props.seconds / 60;
  return (
    <div>
      <span>{props.seconds} second{props.seconds === 1 ? "" : "s"} elapsed</span>
      {" "}
      <span>({minutes().toFixed(2)} minutes)</span>
    </div>
  );
}

function Timer() {
  const [seconds, setSeconds] = createSignal(0);
  setInterval(() => setSeconds(seconds() + 1), 1000);
  return (
    <BrokenDisplay2 seconds={seconds()} />
  );
}

render(() => <Timer />, document.getElementById("app")!);
```

In Solid.js, destructuring props or computing derived values outside of reactive contexts breaks reactivity. The component won't update when the signal changes because you've extracted the value at a specific point in time rather than maintaining the reactive connection. These bugs are hard to spot because your component renders correctly initially - it's only when the state changes that you notice the view hasn't updated. They're also conceptually difficult to fix because you need to understand the framework's reactive rules: which contexts preserve reactivity and when values are accessed versus evaluated.

With Crank's explicit refresh model, this entire category of bugs doesn't exist. Props are just values passed to functions. You can destructure them, compute derived values, pass them around - it's all just JavaScript. When you want the component to update, you call `refresh()`. There's no invisible reactive graph to accidentally break.

### Vue's Deep Reactivity Performance Trap

Vue automatically wraps all your state objects in reactive proxies, including nested objects. While convenient, this deep reactivity tracking becomes a performance bottleneck for large data structures. The official Vue.js benchmark implementation reveals this abstraction leak:

```js
import { ref, shallowRef } from 'vue'

// ❌ Using ref() would wrap the entire array and all objects in proxies
// const rows = ref([])

// ✅ Must use shallowRef to avoid deep reactivity for performance
const rows = shallowRef([])

function setRows(update = rows.value.slice()) {
  // Manually trigger reactivity by reassigning
  rows.value = update
}

function update() {
  const _rows = rows.value
  for (let i = 0; i < _rows.length; i += 10) {
    _rows[i].label += ' !!!'
  }
  // Must manually trigger update after mutations
  setRows()
}
```

Vue provides escape hatches like `shallowRef`, `markRaw`, and `isReactive()` to work around these performance issues. But their very existence highlights how the reactive abstraction leaks - you need to understand and actively fight against the framework's default behavior to achieve acceptable performance.

### Svelte's Effect Loop Trap

Svelte's `$effect` rune can create infinite loops when effects modify the state they're tracking. Consider this innocent-looking login form:

```svelte
<script>
  let password = $state('');
  let attempts = $state(0);
  let isSubmitting = $state(false);

  // ❌ Creates infinite loop!
  $effect(() => {
    if (isSubmitting && password !== 'hunter2') {
      attempts++; // This triggers the effect again!
      setTimeout(() => {
        isSubmitting = false;
        password = '';
      }, 2000);
    }
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (password) {
      isSubmitting = true;
    }
  }
</script>

<form onsubmit={handleSubmit}>
  <input
    type="password"
    bind:value={password}
    disabled={isSubmitting}
  />
  <button type="submit" disabled={isSubmitting || !password}>
    {isSubmitting ? 'Checking...' : 'Login'}
  </button>
  <p>Failed attempts: {attempts}</p>
</form>
```

The effect runs when `isSubmitting` changes to true, increments `attempts`, which triggers the effect again because `attempts` is reactive state being tracked. You need Svelte's `untrack()` escape hatch:

```js
// ✅ Must use untrack() to break the reactive chain
$effect(() => {
  if (isSubmitting && password !== 'hunter2') {
    untrack(() => {
      attempts++;
    });
    // ... rest of logic
  }
});
```

Even innocuous operations like logging can trigger infinite loops if you're not careful. Svelte provides `untrack()` as an escape hatch, but again, needing to opt out of reactivity to avoid bugs reveals the fundamental complexity of the reactive model.

In Crank, these performance traps and infinite loops simply don't exist. State is just JavaScript variables. Updates happen when you call `refresh()`. There's no hidden proxy wrapping, no reactive tracking to accidentally trigger, no need for escape hatches like `shallowRef` or `untrack()`.

The irony is that reactive abstractions promise to eliminate manual update management, yet each framework requires its own set of escape hatches and workarounds. Solid needs `splitProps` and `mergeProps` to safely manipulate props. Vue needs `shallowRef` and `markRaw` to avoid performance cliffs. Svelte needs `untrack()` to prevent infinite loops. These APIs exist precisely because reactivity doesn't fully insulate you from update concerns - it just transforms them into different, often more subtle problems.

### Executional Transparency

Referential transparency is a formal quality of code where you avoid side-effects and use immutable variable declarations and data structures. The result of these constraints is that it becomes easier to “see” how data is transformed in your code, because there is no hidden state elsewhere which changes how the data is tranformed.

While I don’t have a similar formal definition for “executional transparency,” I see the value of it as knowing *when* code runs, just as reactive transparency as knowing *what* is happening when it runs. Frameworks, classically defined as abstractions which exhibit “Inversion of Control,” or simply defined APIs which call your code rather than your code calling the API, clearly have an important role to play in making your code executionally transparent. Crank code is executionally transparent because of its explicitness: a component runs if and only if it is updated by a parent or `refresh()` is called. Crank also encourages executionally transparent code in a “exercise every day” kind of way, in that it forces developers to reason about when exactly they need their app updated. 

The root of this philosophy of prioritizing “executional transparency” is that I thought that a disregard of executional transparency was as the single biggest pain point of React. Over the years, React devalued this sort of transparency by design, by, for instance, double-rendering in render functions in development to ensure that rendering doesn’t contain any side-effects, and implementing confusing APIs like `useEffect()` which are passed callbacks which may be ignored or run arbitrarily according to an arbitrary scheduling algorithm. At each step of post-class React development, it seems that React has made component code more and more executionally opaque by cutting up the component model into more and more individual callbacks which can be fired at any time, and differently based on platform.

The result for the ecosystem is countless misunderstandings and blog posts about when code runs, a variety of tools to help developers debug excess rendering like `Why Did You Render`, and best practice disputes for even the simplest of tasks like storing a constant value in scope over the lifetime of a component (can you use “memoization” helpers like `useMemo()` or are the callbacks going to be re-called according to some arbitrary cache eviction?).

