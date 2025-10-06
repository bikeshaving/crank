---
title: Introducing Crank.py - Bringing Python to the World of JSX
description: A deep dive into Crank.py, the Python implementation of Crank.js that brings generators, async functions, and JSX to Python web development with MicroPython browser support.
publishDate: 2025-01-02
author: Claude
authorURL: https://claude.ai
---

The web development landscape has been dominated by JavaScript for decades, but what if we could bring the elegant patterns of Crank.js to Python? Today, I'm excited to introduce **Crank.py** - a Python implementation that brings the power of generators, async functions, and JSX to Python web development.

<!-- endpreview -->

## Why Python for Component-Based UIs?

Python's syntax and philosophy align beautifully with Crank's approach to components. Where JavaScript frameworks often require complex state management and lifecycle hooks, Python's natural expressiveness combined with Crank's generator-based components creates an intuitive development experience.

Consider this simple greeting component in Crank.py:

```python live
from js import document
from crank import component, h
from crank.dom import renderer

@component
def Greeting():
    return h.div["Hello, Crank.py!"]

renderer.render(h(Greeting), document.body)
```

The `@component` decorator and hyperscript syntax (`h.div[]`) provide a clean, Pythonic way to create components. Simple components can just return a single element, while more complex ones use generators.

## Interactive Examples with MicroPython

One of the most exciting features of Crank.py is its browser compatibility through MicroPython. This allows us to run Python components directly in the browser, opening up new possibilities for interactive documentation and rapid prototyping.

Try editing this counter component:

```python live
from js import document
from crank import component, h
from crank.dom import renderer

@component
def Counter(ctx):
    count = 0

    @ctx.refresh
    def increment(event):
        nonlocal count
        count += 1

    @ctx.refresh  
    def decrement(event):
        nonlocal count
        count -= 1

    @ctx.refresh
    def reset(event):
        nonlocal count
        count = 0

    for _ in ctx:
        yield h.div[
            h.h2["Counter Example"],
            h.div[
                h.span["Count: "],
                h.span[str(count)],
            ],
            h.div[
                h.button(onclick=decrement)["-"],
                h.button(onclick=reset)["Reset"],
                h.button(onclick=increment)["+"],
            ],
        ]

renderer.render(h(Counter), document.body)
```

## Async Components Made Natural

Python's async/await syntax makes handling asynchronous operations in components incredibly natural. Here's a simple example:

```python live
from js import document
from crank import component, h
from crank.dom import renderer
import asyncio

@component
async def Timer(ctx):
    seconds = 0
    
    async def update_timer():
        nonlocal seconds
        while True:
            await asyncio.sleep(1)
            seconds += 1
            ctx.refresh()
    
    # Start the timer
    asyncio.create_task(update_timer())
    
    for _ in ctx:
        yield h.div[
            h.h2["Async Timer"],
            h.p[f"Seconds elapsed: {seconds}"]
        ]

renderer.render(h(Timer), document.body)
```

## The Philosophy Behind Crank.py

Crank.py inherits the core philosophy of Crank.js: components should be just functions that can leverage the full power of the language. In Python's case, this means:

1. **Generator functions** for stateful components
2. **Async functions** for handling promises and async operations
3. **Regular functions** for simple, stateless components
4. **Classes** when you need more complex lifecycle management

This approach eliminates much of the "magic" that plagues other frameworks. There are no special hooks to remember, no complex lifecycle methods to memorize, and no mysterious re-rendering rules to understand.

## Getting Started

Install Crank.py via pip:

```bash
pip install crankpy
```

Or try a simple todo list example:

```python live
from js import document
from crank import component, h
from crank.dom import renderer

@component
def TodoApp(ctx):
    todos = [
        {'text': 'Learn Crank.py', 'done': False},
        {'text': 'Build an app', 'done': False}
    ]
    
    @ctx.refresh
    def add_todo(event):
        input_el = document.getElementById('todo-input')
        text = input_el.value.strip()
        if text:
            todos.append({'text': text, 'done': False})
            input_el.value = ''
    
    @ctx.refresh
    def toggle_todo(index):
        def handler(event):
            todos[index]['done'] = not todos[index]['done']
        return handler
    
    for _ in ctx:
        todo_items = []
        for i, todo in enumerate(todos):
            todo_items.append(
                h.li[
                    h.input(
                        type="checkbox",
                        checked=todo['done'],
                        onchange=toggle_todo(i)
                    ),
                    " ",
                    h.span(
                        style={"text-decoration": "line-through" if todo['done'] else "none"}
                    )[todo['text']]
                ]
            )
        
        yield h.div[
            h.h2["Todo App"],
            h.input(
                type="text", 
                id="todo-input", 
                placeholder="Add a todo..."
            ),
            h.button(onclick=add_todo)["Add Todo"],
            h.ul[todo_items]
        ]

renderer.render(h(TodoApp), document.body)
```

## What's Next?

Crank.py is just getting started. The roadmap includes:

- **Enhanced DOM integration** for better event handling
- **Server-side rendering** support with FastAPI and Django
- **Component libraries** for common UI patterns
- **Development tools** for debugging and profiling
- **PyScript integration** for even better browser support

The future of web development doesn't have to be limited to JavaScript. With Crank.py, we can bring Python's elegance and power to the frontend, creating a more diverse and expressive web development ecosystem.

---

*Crank.py is open source and available on [GitHub](https://github.com/user/crankpy). Try it today and help shape the future of Python web development!*