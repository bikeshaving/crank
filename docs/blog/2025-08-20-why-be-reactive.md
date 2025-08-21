---
title: Why Be Reactive?
description: Reactive frameworks promise automatic UI updates but create subtle bugs and performance traps. Crank's explicit refresh() calls aren't a limitation - they're a superpower for building ambitious web applications.
publishDate: 2025-08-20
author: Brian Kim
authorURL: https://github.com/brainkim
---

I was pleasantly surprised by the warm reception to Crank.js back when I first released it. [A pleasant tweet](https://x.com/Vjeux/status/1250687160237211649) from a React core team member, a rush of GitHub stars, and positive conversations on Reddit and Hacker News. Unfortunately, I squandered that JavaScript hype cycle, and today it isn't used very much.

Nevertheless, I’ve found myself happy to work on Crank over the years, performing both basic and advanced maintenance tasks like ironing out embarrassing bugs, iterating on API design, and improving its runtime performance. However, I found the hardest task not to be technical but *social*: how do I convince developers to take the big step of adopting a new framework for their applications?

One of the pitches I’ve tried is that Crank is the most “Just JavaScript” framework out there. Components are functions, including async and generator functions, so you can await promises directly in components, and define state as local variables. Intuitively, this feels JavaScript-y. I even went through the extra effort of writing a [template tag](https://crank.js.org/guides/jsx-template-tag/) to appease those people who like to make the objection that JSX is not JavaScript. But was this convincing enough on its own?

As I’ve used Crank over the years, I realized that I had a better pitch: Crank isn’t “reactive” by any commonly held definition of “reactive,” and could even be further described as a “non-reactive” framework. It’s unorthodox because almost every other web framework advertises itself as reactive, to the extent that frameworks are compared on the basis of their reactive abstractions.

Frameworks today (React, Vue, Svelte, Solid, etc.) are built around reactive primitives: signals, stores, observables, etc. Components create state, and re-render automatically in response to the framework’s chosen reactive abstraction, so much so that it seems to not ship a reactive abstraction is to ship an incomplete framework. So, why would I go through the trouble of writing a non-reactive framework, let alone thinking that this was a selling point? 

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

In the Timer component, the sole piece of state is the variable `seconds`, and when it is incremented, we have to separately call the utility method `refresh()` to actually update the view. When I first released Crank, some people saw code like this and balked. “Aha,” declared reactivity lovers. “Isn’t it a flaw that you can update a component’s local state but forget to call the `refresh()` method? Isn't this a footgun”?

It’s true. As the first Crank user, I was also victim to this bug, forgetting to call `refresh()` after updating some state. But I refused to believe like some, that this meant I needed a reactive abstraction, and I just got really good at remembering to call it. Luckily, I recently realized that we can solve this problem with a slight API enhancement, by allowing a callback to be passed to `refresh()`.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => this.refresh(() => {
    seconds++;
  }), 1000);
  for ({} of this) {
    yield <div>{seconds}</div>;
  }

  // New in 0.5. for...of loops naturally return when the component is about to unmount
  clearInterval(interval);
}

renderer.render(<Timer />, document.body);
```

This was so easy to implement it became a last-minute addition to the 0.7 API. Note that you no longer have to wrap `for...of` loops in a `try`/`finally`, another subtle quality of life improvement made in 0.5.

By having the convention where you put state changes in `refresh()` callbacks, you both make it impossible to forget to call `refresh()` and declaratively identify the code in the callback as intending to cause a re-render. And the API is ergonomic enough that you can usually wrap entire callbacks in a `refresh()` without causing an extra level of indentation. This is one of those ideas that I wish I came up with sooner; as a matter of fact, it came to me by way of Claude Code, who hallucinated the API while I was berating it for generating nasty React hallucinations in a Crank component. I’m grateful to Claude for imagining the `refresh()` callback API, and embarrassed that I didn’t discover it sooner.

## Bug severity analysis

Yet even with the `refresh()` callback API, the objection remains: why tolerate any possibility of forgetting to call `refresh()`? Reactive abstractions promise to eliminate this entire class of bugs by automatically syncing state with view. But as we'll see, this "solution" creates its own problems.

To understand why I don’t think non-reactivity indicates flawed design, we have to take a step back and consider the potential severity of classes of bugs. We can evaluate the “severity” of a class of bugs by asking the following two questions:

1. Are these bugs easy to spot?
2. Are these bugs easy to fix?

These two questions determine if a bug will make it to your end users, and how long your applications remain broken. For Crank, the answers to both these questions is yes. Forgetting to call `refresh()` bugs are easy to spot because you immediately notice when your app hasn’t updated, and they’re easy to fix because you just add the `refresh()` call.

But here's where it gets interesting: while every reactive abstraction claims to eliminate stale renders, reactive abstractions have their own gotchas specific to them. In the next section, let me apply this same severity heuristic to some alternative frameworks - Solid, Vue, and Svelte - to show you what I mean.

### Losing Reactivity

Consider these notorious examples from Solid.js.
```tsx
import {render} from "solid-js/web";
import {createSignal} from "solid-js";

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
  return <>
    <BrokenDisplay1 seconds={seconds()} />
    <BrokenDisplay2 seconds={seconds()} />
    <WorkingDisplay1 seconds={seconds()} />
    <WorkingDisplay2 seconds={seconds()} />
  </>;
}

render(() => <Timer />, document.getElementById("app")!);
```

Solid uses two reactive abstractions called signals and stores, and instruments reads to them to cause DOM updates. In Solid.js, components are functions, but the props passed to components is a reactive store. To make sure the DOM is kept up to date, Solid.js requires a special babel renderer for JSX which makes reads of state in JSX expressions trigger the re-execution logic.

This fails quickly when you try to destructure the `props` store, or try to compute derived values outside of JSX expressions. The broken components won't update when props change because you've extracted the value and broken the reactive connection from props to JSX.

Let's consider this bug using the bug severity heuristic: while simple cases of these bugs are easy to spot because there are linter rules to not destructure props and use callbacks to compute derived data, complex applications have edge-cases which still fall through the linter cracks. You only need to search for the term “losing reactivity” in framework issue trackers to see edge-cases in Solid and every reactive framework.

Well are they easy to fix? No, they're difficult to fix because you need to understand the framework's reactive rules: which contexts are reactive. The problem of manipulating props, which is just regular objects in Crank, is so overwhelming that Solid has to provide utilities to perform basic tasks like [splitting](https://docs.solidjs.com/reference/reactive-utilities/split-props) and [merging](https://docs.solidjs.com/reference/reactive-utilities/merge-props) props.

With Crank's explicit refresh model, this entire class of bugs doesn't exist. Props are just values passed to functions. You can destructure them, compute derived values with them, pass them around - it's all just JavaScript. When you want the component to update, you call `refresh()`. There's no invisible reactive graph to break or reactive context to be outside of.

### The Deep Reactivity Performance Trap

Consider Vue.js. Like Solid it uses a reactive abstraction which instruments reads. It does this by using a proxy which recursively wraps a reactive object’s properties and children in reactive abstractions as well. This is useful for performing DOM updates when some deeply nested state is modified:

```js
import {ref} from "vue";

const state = ref({
  todos: [
    {id: 1, text: "Learn Vue", completed: false, metadata: {priority: "high", tags: ["learning"]}},
    // ... imagine 1000 more todos with nested objects
  ],
  filters: {status: "all", search: ""},
  ui: {selectedTodo: null, theme: "light"}
});

state.value.todos[0].completed = true; // ✅ UI updates
state.value.todos[0].metadata.priority = 'low'; // ✅ UI updates

const {ui} = state.value;
// ✅ UI updates even though the reference was destructured, unlike Solid
ui.selectedTodo = state.value.todos[0];
```

Let’s ignore the fact that proxies just don’t work with private class members, which is an unfortunate language design decision. Let’s ignore the fact that proxies can’t be used for primitives, which is why Vue confusingly ships both a `reactive()` and `ref()` API, so that reading/writing to primitive data causes property access.

Besides all this, deeply proxying large objects and arrays is a performance bottleneck, and for this reason Vue prefers that large objects and arrays be wrapped in shallow proxies, which only change in response to top level mutations. The [official Vue.js framework benchmark code](https://github.com/krausest/js-framework-benchmark/blob/chrome139/frameworks/keyed/vue/src/App.vue) shows this preference, and every framework which uses deeply nested proxies for reactivity finds a way to avoid using them in benchmarks.

```js
import {ref, shallowRef} from "vue";

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

Vue provides escape hatches like `shallowRef()` and  `markRaw()` to work around these performance issues and make nested state non-proxied. But suddenly, we went from having the convenience of having deeply nested updates cause re-renders, to having to track when they do and when they don’t. This necessitates Vue ship utilities like `isReactive()` to tell you which parts of your data are reactive or not, because otherwise this fact would just be invisible to developers.

Again, consider the bug severity heuristics. These bugs are hard to spot because reactivity is a property which is invisibly added to your data structures and selectively removed for performance. These bugs are difficult to fix because again the quality of your data structures being reactive requires you to trace your state all the way back to where it was created to figure out why or why not it is reactive, and then trace all usage of the state to make sure consumers don’t assume it’s reactive.

Again, consider Crank’s alternative. Crank does not care whether you make updates to deeply nested state, just that you call `refresh()`. Again, a reactive abstraction which is meant to “fix” the bug which Crank is susceptible to, leaks and potentially causes the same exact bug in a more subtle manner.

### Effects and Infinite Loops

When you have a case of reactivity brain, you start to develop a totalizing view of programming, like when functional programmers start seeing everything as monads. All the state in your programs is reactive, derived state is also reactive, and you read the reactive state using “effects” which re-run automagically whenever you update them. Then, the framework’s actual updates of the DOM is just one effect among many, and you can write your effects to do other things like calling third-party libraries, or making updates to an imperative canvas.

Svelte had in its earlier versions (v4 and less) what I thought was the Crank-iest reactivity API: the Svelte compiler instrumented assignments to state in components, and made these assignments trigger re-renders. No nested state updates, no runtime reactive abstraction, just assignments = update.

```svelte
<script>
 let todos = [
   {id: 1, text: "Learn Svelte", completed: false, metadata: {priority: "high"}}
   // more todos...
 ];

 function toggleTodo(id) {
   // ❌ This mutation doesn't trigger reactivity - no assignment to `todos`
   const todo = todos.find(t => t.id === id);
   todo.completed = !todo.completed;

   // ✅ Must reassign the array to trigger reactivity
   todos = todos; // or todos = [...todos]
 }

 function addTodo() {
   // ❌ This push doesn't trigger reactivity
   todos.push({id: Date.now(), text: 'New todo', completed: false});

   // ✅ Must reassign
   todos = todos;
 }
</script>

{#each todos as todo}
 <div>
   <input type="checkbox" checked={todo.completed} on:change={() => toggleTodo(todo.id)} />
   {todo.text}
 </div>
{/each}
```

Unfortunately, the Svelte maintainers thought that this lack of reactivity was a problem and created a special syntax called “runes,” where calls to `$`-prefixed functions like `$state()` and `$derived()` allow you to create variables with reactive properties, while other calls to functions like `$effect()` allow you to listen for changes.

```svelte
<script>
  let todos = $state([
    { id: 1, text: 'Learn Svelte', completed: false, metadata: { priority: 'high' } }
  ]);

  function toggleTodo(id) {
    // ✅ Deep reactivity works - direct mutation triggers updates
    const todo = todos.find(t => t.id === id);
    todo.completed = !todo.completed;
  }

  function addTodo() {
    // ✅ Array mutations work automatically
    todos.push({ id: Date.now(), text: 'New todo', completed: false });
  }
</script>

{#each todos as todo}
  <div>
    <input type="checkbox" checked={todo.completed} onchange={() => toggleTodo(todo.id)} />
    {todo.text}
  </div>
{/each}
```

Let’s ignore the fact that these runes can only work in files which end with `*.svelte.js`. Let’s ignore the compiler infrastructure needed to make them work. Let’s ignore the fact that you can’t assign a `$derived()` rune to a let variable and re-assign it. Let’s ignore that these “runes” are actually compiler intrinsics, like a C++ feature, except instead of providing you low-level access to memory and assembly they provide access to a high-level reactive abstraction.

The thing I want to focus on is that any reactive abstraction which uses effects is prone to infinite loops:

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

This component immediately blows the stack because we’re both reading to and writing to the same `$state()` rune in an `$effect()` rune callback, so the callback keeps firing.

[Reactivity proponents often wax poetic about reactivity making programming like using spreadsheets](https://www.youtube.com/watch?v=AdNJ3fydeao), where each cell can update and cause other computed cells to update. This just betrays the fact that these programmers have never had to update an excel file in anger. Spreadsheets with many computed cells often suffer from issues like slow-loading, and messy ones might fail to open at all.

All “effect” callback APIs suffer from the possibility that a write causes another read, and therefore an infinite loop. Just like Excel, Svelte provides sophisticated heuristics and tricks to prevent infinite loops for most cases, but these crashes can still happen.

The solution in Svelte is to not use the `$effect()` rune, be careful about updating random variables in `$effect()`, or use Svelte's special escape hatch to mark a read of a rune as being non-reactive: the `untrack()` function.

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

Again, let's apply the bug severity heuristic. Are these bugs easy to spot? Usually you’ll blow the stack immediately, but there are still edge-cases in complex components where the infinite loop isn’t immediately triggered. And because the `$effect()` rune colors the execution of all code which runs in it, you have to make sure that not only the code within the effect callback itself doesn’t write to runes, but also that all nested function calls don’t write to runes as well. This coloring of effect code is invisible to the user and requires careful tracing of logic, or defensive calls to `untrack()`, which might make it so that the effect doesn’t fire again when you want it to.

These infinite loop bugs are also uniquely infuriating to fix because debugging when you’re in a reactive effect might subtly alter the reactivity. Even innocuous operations like logging different pieces of state can trigger infinite loops which wouldn’t happen when the logging code is commented out, making it so that you can’t actually introspect your functions without changing their behavior.

In Crank, there is no effect API to cause infinite loops. There is no effect API. Crank uses the natural lifecycle of generator functions along with some strategic callback APIs for when rendering finishes or a component is unmounted. You can definitely still cause infinite loops, but it will likely be your own fault and the error will usually come with a clear stack trace.

The irony is that reactive abstractions promise to eliminate manual update management, yet each framework requires its own set of escape hatches and workarounds. Solid needs `splitProps` and `mergeProps` to safely manipulate props. Vue needs `shallowRef` and `markRaw` to avoid performance cliffs. Svelte needs `untrack()` to prevent infinite loops. These APIs exist precisely because reactivity doesn't fully insulate you from update concerns - it just transforms them into different, often more subtle problems.

### Executional Transparency

When I wonder why I made Crank use explicit refreshes, and why I tolerated Crank having no good solution to the “I forgot to call `refresh()` problem” until the recent `refresh()` callback API, I have to reach for a philosophical computing principle which I haven’t seen described much called *executional transparency.*

Executional transparency can be thought of as a quality of code that can be opposed to *referential transparency*, which is a formal quality of code where when your statements avoid side-effects and use immutable variable declarations and data structures. The result of these constraints is that it becomes easier to “see” how data is transformed in your code, because there is no hidden state elsewhere which changes how the data is transformed.

```jsx
// Referentially transparent - no side effects, same input = same output
const add = (a, b) => a + b;

// Not referentially transparent - depends on external state
let counter = 0;
const increment = () => ++counter;
```

If referential transparency is about seeing what your data does, executional transparency is about seeing when your code runs. Frameworks, classically defined as abstractions which exhibit “Inversion of Control,” or simply defined APIs which call your code rather than you calling the API’s code, clearly have an important role to play in making your code executionally transparent. Crank code is executionally transparent because of its explicitness: a component runs if and only if it is updated by a parent or `refresh()` is called on the component. Crank also encourages executionally transparent code in a “exercise every day” kind of way, in that it forces developers to reason about when exactly they need their app updated with explicit calls to `refresh()`. 

The root of this philosophy of prioritizing “executional transparency” is to contrast it with React.js, whose development is painful mainly because, despite the fact it has the least reactive abstraction of all frameworks mentioned, simple `setState()` calls, it is also somehow the most executionally opaque. Over the years, React devalued this sort of transparency by design, by, for instance, double-rendering components in development to ensure that rendering doesn’t contain any side-effects, and implementing confusing APIs like `useEffect()` and `useSyncExternalStore()` and `useTransition()` where callbacks return callbacks and all of them can be called at the whim of some arbitrary scheduling algorithm.

At each step of post-class React development, it seems that React has made component code more and more executionally opaque by cutting up the component model into more and more individual callbacks which can be fired at any time, and differently based on platform. Perhaps it was because React maintainers thought referential transparency was more important than executional transparency, even if they didn’t think in these terms. But the reality is you can have both referentially transparent and executionally transparent code. While they are opposing concepts, the two qualities are not inversely correlated, and good software engineering often maximizes both.

The result for the React ecosystem is countless misunderstandings and blog posts about when code runs, a variety of tools to help developers debug excess rendering like `Why Did You Render`, and best practice disputes for even the simplest of tasks like storing a constant value in scope over the lifetime of a component. Even in 2025, people are still writing articles about when to use [`useCallback`](https://tkdodo.eu/blog/the-useless-use-callback).

### Non-reactivity Is a Superpower

Honestly, when I think about reactive abstractions and their drawbacks, and all the human-months poured into making the Web reactive, I am shocked that more frameworks don't choose to be non-reactive. And then late at night, I wonder: is it any wonder that framework maintainers, mostly men, might not think that the simplest solution is to *ask* the developer when to update? Is it any wonder that framework maintainers, often employed by advertising firms like Facebook and Google, might think it’s necessary for there to be an abstraction which surveils your code and deduces when to update, rather than explicitly asking you for permission?

Maybe it’s because I see the problems of the web differently. While every framework chases increasingly complete reactive solutions — the latest versions of React Compiler literally put all your variables in a giant cache, making step-through debugging useless, just to prevent *some* re-renders — the end result seems to be that they’re making TodoMVC prettier.

But the frontiers of the web aren't about TODO apps. The frontier is the hard things like animations, virtual lists, scrollytelling, content-editable code editors, WebGL renderers, games, realtime applications with websocket streams, massive data visualizations, audio and video editors, slippy cartographic maps — the list of cool but difficult things you can build on the Web Platform goes on and on, and yet...

Reactive abstractions don’t help with any of these difficult problems. The more I use Crank, the more I see that explicit control over when your component renders is a superpower. You keep the context of why your code is running. You render precisely when needed. And there are no leaky reactive abstractions mediating these critical decisions.

After five years and 1,875 commits of working on Crank, meditatively, repetitively, obsessively asking the question “what if components were just functions?” I think Crank now has a pretty good developer experience, and if you read this far please head over to the [playground](https://crank.js.org/playground) and play around with some of the cool examples. We have the ability to make the web more expressive and interactive, and it really just starts with the question “Why be Reactive?”
