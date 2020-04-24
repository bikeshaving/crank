---
title: Lifecycles
---

Crank uses the full power and expressiveness of generator functions to encapsulate the notion of lifecycles within the same variable scope. Internally, Crank achieves this by calling the calling the `next`, `return` and `throw` methods of the generator object as components are inserted, updated and removed from the element tree. As a developer, you can use the `yield`, `return`, `try`, `catch`, and `finally` keywords within your generator components to take full advantage of the generator’s natural lifecycle.

## Returning from a generator

Usually, you’ll yield in generator components so that they can continue to respond to updates, but you may want to also `return` a final state. Unlike function components, which are called and returned once for each update, once a generator component returns, it will never update again.

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

You should be careful when writing generator components to make sure that you always place your `yield` operators in a `for` or `while` loop. If you forget and implicitly return from the generator, it will stop updating, nothing will be rendered, and the only way to restart the component will be to remove it from the element tree and add it again.

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

renderer.render(null, document.body);
renderer.render(<Numbers />, document.body);
console.log(document.body.innerHTML); // "1"
```

## Cleaning up after your components are removed

When a generator component is removed from the tree, Crank calls the `return` method on the generator object. You can think of it as whatever `yield` expression your component was suspended on being replaced by a `return` statement. This means any loops your component was in when the generator was suspended are broken out of, and code after the yield does not execute. You can take advantage of this behavior by wrapping your `yield` loops in a `try`/`finally` to release any resources that your component may have used.

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

[The same best practices](https://eslint.org/docs/rules/no-unsafe-finally) which apply to try/finally blocks in regular functions apply to generator components. In short, you should not yield or return anything in the `finally` block. Crank will not use the produced values and doing so might cause your components to inadvertently swallow errors or suspend in an unexpected location.

## Catching errors thrown by children 
We all make mistakes, and it can be useful to catch errors in our components so that we can show the user something or notify error-logging services. To facilitate this, Crank will catch errors thrown when rendering child elements and throw them back into parent generator components by calling the `throw` method on the generator object. You can imagine that the most recently suspended `yield` expression is replaced with a `throw` statement with the error set to whatever was thrown during rendering. You can take advantage of this behavior by wrapping your `yield` operations in a `try`/`catch` block to catch errors caused by children.
 
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

This component “sticks” at the return so that error message is shown until the component is unmounted. However, you may also want to recover from errors as well, and you can do this by ignoring or handling the error.

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
console.log(document.body.innerHTML); // "<div>Come with me if you want to live</div>"
renderer.render(<Terminator />, document.body);
console.log(document.body.innerHTML); // "<div>I’ll be back</div>"
renderer.render(<Terminator />, document.body);
console.log(document.body.innerHTML); // "<div>Come with me if you want to live</div>"
renderer.render(<Terminator />, document.body);
console.log(document.body.innerHTML); // "<div>I’ll be back</div>"
```

Note that you can’t catch or recover from errors thrown from within the generator themselves, the yield operator only throws errors which were thrown in the course of rendering child elements.

## Accessing rendered values
Sometimes, the declarative rendering of DOM nodes is not enough, and you’ll want to access the actual DOM nodes you’ve rendered, to make measurements or call imperative methods like `el.focus()`, for instance. To facilitate this, Crank will pass rendered DOM nodes back into the generator using the `next` method, so `yield` expressions can be read and assigned to access the actual rendered DOM nodes.

```jsx
async function *MyInput(props) {
  let input; 
  for await (props of this) {
    input = yield <input {...props}/>;
    input.focus();
  }
}
```

The above component focuses every time it is rerendered. You might notice that we use an async generator component here. That’s because async generators continuously resume, and rely on the `for await` loop to await new updates.

**TODO: Design APIs/Document them for working with yield expressions in sync generators.**
