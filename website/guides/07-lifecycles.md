---
title: Lifecycles
---

Crank uses generator functions rather than hooks or classes to define component lifecycles. Internally, this is achieved by calling the `next`, `return` and `throw` methods of the returned generator object as components are mounted, updated and unmounted from the element tree. As a developer, you can use the `yield`, `return`, `try`, `catch`, and `finally` keywords within your generator components to take full advantage of the generator’s natural lifecycle.

## Returning Values

In most generator components, you will yield children within a loop so that they can continue to respond to updates. However, you may also want to return a final state. Unlike function components, which are called and returned once for each update, once a generator component returns, its rendered value is final, and the component will never update again.

```jsx
function *Stuck({message}) {
  return <div>{message}</div>;
}

renderer.render(<Stuck message="Hello" />, document.body);
console.log(document.body.innerHTML); // "<div>Hello</div>"
renderer.render(<Stuck message="Goodbye" />, document.body);
console.log(document.body.innerHTML); // "<div>Hello</div>"
renderer.render(<Stuck message="Passing in new props is useless" />, document.body);
console.log(document.body.innerHTML); // "<div>Hello</div>"
```

You should be careful when writing generator components to make sure that you always place your `yield` operators in a `for` or `while` loop. If you forget and implicitly return from the generator, it will stop updating and nothing will be rendered ever again.

```jsx
function *Numbers() {
  yield 1;
  yield 2;
  yield 3;
}

renderer.render(<Numbers />, document.body);
console.log(document.body.innerHTML); // "1"
renderer.render(<Numbers />, document.body);
console.log(document.body.innerHTML); // "2"
renderer.render(<Numbers />, document.body);
console.log(document.body.innerHTML); // "3"
renderer.render(<Numbers />, document.body);
console.log(document.body.innerHTML); // ""
renderer.render(<Numbers />, document.body);
console.log(document.body.innerHTML); // ""
```

## Cleaning Up

When a generator component is removed from the tree, Crank calls the `return` method on the component’s generator object. You can think of it as whatever `yield` expression your component was suspended on being replaced by a `return` statement. This means any loops your component was in when the generator suspended are broken out of, and code after the yield does not execute.

You can take advantage of this behavior by wrapping your `yield` loops in a `try`/`finally` block to release any resources that your component may have used.

```jsx
function *Cleanup() {
  try {
    while (true) {
      yield "Hi";
    }
  } finally {
    console.log("finally block executed");
  }
}

renderer.render(<Cleanup />, document.body);
console.log(document.body); // "Hi"
renderer.render(null, document.body);
// "finally block executed"
console.log(document.body); // ""
```

[The same best practices](https://eslint.org/docs/rules/no-unsafe-finally) which apply to `try`/`finally` statements in regular functions apply to generator components. In short, you should not yield or return anything in the `finally` block. Crank will not use the yielded or returned values and doing so might cause your components to inadvertently swallow errors or suspend in unexpected locations.

## Catching Errors
We all make mistakes, and it can be useful to catch errors thrown by our components so that we can show the user something or notify error-logging services. To facilitate this, Crank will catch errors thrown when rendering child elements and throw them back into parent generator components using the `throw` method on the component’s generator object. You can think of it as whatever `yield` expression your component was suspended on being replaced with a `throw` statement with the error set to whatever was thrown by the component’s children.

You can take advantage of this behavior by wrapping your `yield` operations in a `try`/`catch` block to catch errors caused by children.
 
```jsx
function Thrower() { 
  throw new Error("Hmmm");
}

function *Catcher() {
  try {
    yield <Thrower />;
  } catch (err) {
    return <div>Error: {err.message}</div>;
  }
}

renderer.render(<Catcher />, document.body);
console.log(document.body.innerHTML); // "<div>Error: Hmmm</div>"
renderer.render(<Catcher />, document.body);
renderer.render(<Catcher />, document.body);
renderer.render(<Catcher />, document.body);
console.log(document.body.innerHTML); // "<div>Error: Hmmm</div>"
```

As explained previously, this component “sticks” because it uses a return statement, so that the same error message is shown until the component is unmounted. However, you may also want to recover from errors as well, and you can do this by ignoring or handling the error.

```jsx
function T1000() { 
  throw new Error("Die!!!");
}

function *Terminator() {
  while (true) {
    yield <div>Come with me if you want to live</div>;
    try {
      yield <T1000 />;
    } catch (err) {
      yield <div>I’ll be back</div>;
    }
  }
}

renderer.render(<Terminator />, document.body);
console.log(document.body.innerHTML);
// "<div>Come with me if you want to live</div>"
renderer.render(<Terminator />, document.body);
console.log(document.body.innerHTML);
// "<div>I’ll be back</div>"
renderer.render(<Terminator />, document.body);
console.log(document.body.innerHTML);
// "<div>Come with me if you want to live</div>"
renderer.render(<Terminator />, document.body);
console.log(document.body.innerHTML);
// "<div>I’ll be back</div>"
```

## Accessing Rendered Values
Sometimes, declarative rendering is not enough, and you’ll want to access the actual DOM nodes you’ve rendered, to make measurements or call imperative methods like the `focus` method for form elements, or the `play` method for media elements. To facilitate this, Crank will pass rendered DOM nodes back into the generator using the `next` method. This means that as a developer, you can read `yield` expressions to access the actual rendered DOM nodes.

```jsx
async function *FocusingInput(props) {
  for await (props of this) {
    const input = yield <input {...props}/>;
    input.focus();
  }
}
```

The `MyInput` component focuses every time it is rerendered. We use an async generator component here because async generators continuously resume, so the `input.focus` call happens directly after the component is rendered. While we also pass rendered nodes into sync generator components as well, attempting to access them directly after the `yield` may lead to surprising results.

```jsx
function *FocusingInput(props) {
  for (props of this) {
    const input = yield <input {...props}/>;
    // This line does not execute until the component is rerendered.
    input.focus();
  }
}
```

The problem is that sync generator components suspend at the point of yield expressions and only resume when updated by the parent or by a call to the `refresh` method. This means that if you were to try to access the rendered value via a `yield` expression, your code would not execute until the moment the component rerenders. You can imagine this as the generator function above suspended exactly before the `yield` expression is assigned to the `input` variable.

To solve this problem, Crank provides an additional method on the context called `schedule`, which takes a callback and calls it with the rendered value after the component executes.

```jsx
function *FocusingInput(props) {
  for (props of this) {
    this.schedule((input) => input.focus());
    yield <input {...props}/>;
  }
}
```

The `schedule` method fires the passed in callback synchronously when component finally renders. However, one unfortunate consequence of using a callback is that we lose the sequential execution of code which makes generator components so elegant and easy to understand. We can recover some of this linearity by using the `schedule` method with the `refresh` method.

```jsx
function *FocusingInput(props) {
  this.schedule(() => this.refresh());
  const input = yield <input {...props} />;
  for (props of this) {
    input.focus();
    yield <input {...props} />;
  }
}
```

The focusing input now focuses before the children are yielded, but because the same input is yielded, the result is mostly the same. The `schedule` method is designed to work with the `refresh` method so that sync generator components can schedule multiple rendering passes which work synchronously.
