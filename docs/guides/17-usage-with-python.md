---
title: Usage with Python
description: Write Crank components in Python with Crank.py. Learn the Pyperscript syntax, generator and async components, and how to set up PyScript.
---

[Crank.py](https://github.com/bikeshaving/crankpy) lets you write Crank
components in Python. It runs in the browser through
[PyScript](https://pyscript.net), on either of its two Python runtimes:
Pyodide (full CPython) or MicroPython (smaller and faster to load). Crank.py
uses Crank.js for rendering, so components behave the same way as they do in
JavaScript.

```python live
from js import document
from crank import component, h
from crank.dom import renderer

@component
def Greeting():
    return h.div["Hello from Python!"]

renderer.render(h(Greeting), document.body)
```

## Setup

Crank.py is on [PyPI](https://pypi.org/project/crankpy/). Add it to your
PyScript config, along with the Crank.js modules it uses:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://pyscript.net/releases/2026.7.3/core.css">
  <script type="module" src="https://pyscript.net/releases/2026.7.3/core.js"></script>
</head>
<body>
  <py-config>
    packages = ["crankpy"]

    [js_modules.main]
    "https://esm.run/@b9g/crank@0.7/crank.js" = "crank_core"
    "https://esm.run/@b9g/crank@0.7/dom.js" = "crank_dom"
  </py-config>
  <script type="py" src="./main.py"></script>
</body>
</html>
```

To use `crank.async_` (`Suspense`, `SuspenseList`, `lazy`) or `crank.html`
(rendering to strings), also add the matching modules:

```toml
"https://esm.run/@b9g/crank@0.7/async.js" = "crank_async"
"https://esm.run/@b9g/crank@0.7/html.js" = "crank_html"
```

To use MicroPython, change `py-config` to `mpy-config` and `type="py"` to
`type="mpy"`.

## Pyperscript

Crank.py builds elements with `h`, a Python stand-in for JSX. Props go in
parentheses and children go in square brackets.

```python
h.div["Hello"]                        # <div>Hello</div>
h.a(href="/about")["About"]           # <a href="/about">About</a>
h.input(type="text", required=True)   # <input type="text" required />
h.hr()                                # <hr />

h.ul[
    h.li["One"],
    h.li["Two"],
]

h(MyComponent, name="Ada")            # <MyComponent name="Ada" />
h(MyComponent)[h.p["Child"]]          # <MyComponent><p>Child</p></MyComponent>
```

A few rules make props work in Python:

- On HTML elements, underscores in prop names become hyphens:
  `data_test_id="x"` becomes `data-test-id="x"`. Props passed to components
  keep their names.
- `class` is a Python keyword, so use `className`. For any other name that
  can’t be a keyword argument, spread a dict: `h.div(**{"class": "box"})`.
- Use a double underscore for namespaced props:
  `h.div(prop__innerHTML=html)` is `<div prop:innerHTML={html} />`.
- A Python list is a fragment. For a fragment with a `key`, use
  `h("", key="a")["One", "Two"]`.
- `Fragment`, `Copy`, `Portal`, `Raw`, and `Text` are importable from
  `crank`.

## Components

Decorate a function with `@component` to make it a component. A component
can take no arguments, a context (`ctx`), or a context and props
(`ctx, props`). Props are a Python dict.

```python live
from js import document
from crank import component, h
from crank.dom import renderer

@component
def Greeting(ctx, props):
    return h.p[f"Hello, {props['name']}!"]

@component
def App():
    return h.div[
        h(Greeting, name="Ada"),
        h(Greeting, name="Grace"),
    ]

renderer.render(h(App), document.body)
```

## Stateful Components

Generator components keep state in local variables, the same way they do in
Crank.js. Loop over `ctx` to receive new props on each render, and use
`nonlocal` to change state from a callback. The `@ctx.refresh` decorator runs
the function and then re-renders the component.

```python live
from js import document
from crank import component, h
from crank.dom import renderer

@component
def Counter(ctx, props):
    count = 0

    @ctx.refresh
    def increment():
        nonlocal count
        count += 1

    for props in ctx:
        yield h.div[
            h.p[f"{props['label']}: {count}"],
            h.button(onclick=increment)["Add one"],
        ]

renderer.render(h(Counter, label="Clicks"), document.body)
```

Event props use lowercase names, as in HTML: `onclick`, `oninput`,
`onsubmit`. A function decorated with `@ctx.refresh` may take the event as
an argument or take no arguments.

The `@ctx.schedule`, `@ctx.after`, and `@ctx.cleanup` decorators register
callbacks for the matching
[lifecycle methods](/guides/lifecycles/).

## Async Components

Components can be `async` functions. Use `await` to load data before
rendering.

```python live
import asyncio
from js import document
from crank import component, h
from crank.dom import renderer

@component
async def Delayed(ctx, props):
    await asyncio.sleep(props["seconds"])
    return h.p[f"Waited {props['seconds']}s"]

renderer.render(
    h.div[
        h(Delayed, seconds=1),
        h(Delayed, seconds=2),
    ],
    document.body,
)
```

On Pyodide, components can also be async generators, and `async for props in
ctx` works as it does in Crank.js. MicroPython can’t compile async generators,
so on MicroPython use a regular generator or an async function instead.

## Template Tag

On Python 3.14 and later, `crank.template` provides a `jsx` tag for
[template strings](https://peps.python.org/pep-0750/) (t-strings). It uses
the same syntax as the [JSX template tag](/guides/jsx-template-tag/).

```python
from crank import component
from crank.template import jsx

@component
def Greeting(ctx, props):
    for props in ctx:
        yield jsx(t"<p class='greeting'>Hello, {props['name']}!</p>")

jsx(t"<{Greeting} name='Ada' />")
```

## Differences from Crank.js

| Crank.js | Crank.py |
| --- | --- |
| `<div class="a">Hi</div>` | `h.div(className="a")["Hi"]` |
| `function *Counter() {}` | `@component` + `def Counter(ctx):` with `yield` |
| `for ({label} of this) {}` | `for props in ctx:` |
| `this.refresh(() => count++)` | `@ctx.refresh` on a function that changes `count` |
| `props.label` | `props["label"]` |
| `onClick` | `onclick` |

## Learn More

- [Crank.py on GitHub](https://github.com/bikeshaving/crankpy)
- [Introducing Crank.py](/blog/introducing-crank-py/)
- [PyScript documentation](https://docs.pyscript.net)
