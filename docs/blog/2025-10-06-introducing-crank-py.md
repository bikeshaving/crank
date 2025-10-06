---
title: Introducing Crank.py
description: A deep dive into Crank.py, the Python adapter for Crank.js that makes Python functions components for frontend development.
publishDate: 2025-10-06
author: Brian Kim
authorURL: https://github.com/brainkim
---

At PyCon 2014, programmer and educator Gary Bernhardt gave a talk entitled [The Birth & Death of JavaScript](https://www.destroyallsoftware.com/talks/the-birth-and-death-of-javascript), in which he presented a semi-fictional 40-year history for JavaScript from 1995 to 2035, starting with its famous haphazard creation by Brendan Eich and ending with a hypothetical future where programming languages are able to run directly in the browser, causing JavaScript’s demise.

While the death of JavaScript might have been a premature prediction, even given the 2035 timeline, the web’s polyglot abilities have continued to advance with compile-to-JavaScript libraries and WebAssembly, to the point where you can use languages like Clojure, Dart, Rust, and Python directly on the web. Today, multilingual frontend applications are technically possible, and limited only by adoption and metrics like page weight.

I recently became interested in Python as a frontend language, specifically via PyScript, which uses a WASM CPython interpreter to make Python in the browser possible. Python is particularly intriguing to me because, despite the hate from Python programmers, Python and JavaScript are actually quite similar: the languages have cross-pollinated over the years, so that they share similar semantics for features like function expressions, `async`/`await` syntax, iterator protocols, and generator functions.

The nearly identical async/generator implementation was key for deciding to write a Crank.js adapter for Python, because Crank.js uses async functions and generator functions for its component model. As it turns out, Python’s syntax and philosophy align beautifully with Crank’s approach, and I’m happy to announce that Crank now has Python bindings which provide the same capabilities of the Crank framework and component model.

```python live
from js import document
from crank import component, h
from crank.dom import renderer

@component
def Greeting():
    return h.div["Hello, Crank.py!"]

renderer.render(h(Greeting), document.body)
```

## Pyperscript Syntax

One of the challenges with writing a Python-first UI framework was coming up with a Pythonic alternative to JSX, the once controversial syntax extension to JavaScript. Thankfully, Python has an expressive `__`-based object model which allows you to override call and bracket syntax. This allowed for a JSX-like domain-specific language without the need for templates or syntax extensions.

```python live
from js import document
from crank import component, h
from crank.dom import renderer

@component
def SyntaxDemo():
    name = "World"
    items = ["Python", "JavaScript", "TypeScript"]
    is_active = True

    return h.div[
        h.h2["Pyperscript Syntax Demo"],

        # Conditional rendering
        h.p[f"Hello, {name}!" if is_active else "Goodbye!"],

        # Attributes and styling
        h.div(
            className="demo-box",
            style={"background": "#f0f0f0", "padding": "15px", "border-radius": "5px"}
        )[
            h.h3["Features:"],

            # List comprehensions in templates
            h.ul[[
                h.li[f"{item} support"] for item in items
            ]],

            # Nested elements with mixed content
            h.p[
                "This demonstrates ",
                h.strong["Python's bracket notation"],
                " creating clean, readable templates without JSX compilation."
            ]
        ],

        # Event handling placeholder
        h.button(onclick=lambda e: None)["Click me!"]
    ]

renderer.render(h(SyntaxDemo), document.body)
```

Any valid Python expression can be embedded in the Pyperscript syntax, and Crank.py handles PyScript FFI for callbacks under the hood.

## The Crank Component Model

In Crank.py, components are just functions which are decorated by the `@component` decorator.
You can use generator functions to define component state, reference it with Python’s `nonlocal` keyword, and even use `async`/`await` in components directly.

```python live
from js import document, FormData
from pyodide.http import pyfetch
from crank import component, h
from crank.dom import renderer
import asyncio

@component
async def Definition(ctx, props):
    word = props['word']
    # API courtesy https://dictionaryapi.dev
    res = await pyfetch(f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}")
    data = await res.json()

    # Check if API returned an error (not an array)
    if not isinstance(data, list):
        return h.div[f"No definition found for {word}"]

    # Extract data exactly like the JavaScript version
    # const {phonetic, meanings} = data[0];
    # const {partOfSpeech, definitions} = meanings[0];
    # const {definition} = definitions[0];
    phonetic = data[0].get('phonetic', '')
    meanings = data[0]['meanings']
    part_of_speech = meanings[0]['partOfSpeech']
    definitions = meanings[0]['definitions']
    definition = definitions[0]['definition']

    return h.div[
        h.p[word, " ", h.code[phonetic]],
        h.p[h.b[f"{part_of_speech}."], " ", definition]
    ]

@component
def Dictionary(ctx):
    word = ""

    @ctx.refresh
    def onsubmit(ev):
        nonlocal word
        ev.preventDefault()
        # Get the input value directly from the DOM
        input_el = document.getElementById("word")
        word1 = input_el.value
        if word1 and word1.strip():
            word = word1.strip()

    for _ in ctx:
        yield h.div[
            h.form(
                action="",
                method="get",
                onsubmit=onsubmit,
                style={"margin-bottom": "15px"}
            )[
                h.div(style={"margin-bottom": "15px"})[
                    h.label(htmlFor="word")["Define: "],
                    h.input(type="text", name="word", id="word", required=True)
                ],
                h.div[
                    h.input(type="submit", value="Search")
                ]
            ],
            h(Definition, word=word) if word else None
        ]

renderer.render(h(Dictionary), document.body)
```

## Pythonic UI development

While Bernhardt might have overstated the death of JavaScript, we're closely approaching a time when Python frontend web development is both possible and appealing. You can use Crank.py with the Pyodide WASM backend, to take advantage of the entire Python ecosystem, or with the MicroPython WASM backend to write (relatively) lightweight frontends.

Crank.py is open source and available on [GitHub](https://github.com/user/crankpy). You can also see a [basic TodoMVC implementation on PyScript.com](https://pyscript.com/@brainkim/crank-todomvc/latest?files=main.py,index.html). It is still under development, and there are likely PyScript FFI and other bugs in the implementation, but is backed by the stable Crank.js framework under the hood. Somehow, making Crank.js a “Just JavaScript” framework has paved the way for Crank.py as a “Just Python” framework. It would have been much more difficult to create adapters for other frameworks, which use compilers or insane `useCallback()` APIs, and I think Crank’s non-reactive, generator and promise driven component model will be a breath of fresh air for Python developers who view the complications of JavaScript frontend development with justified skepticism.

## Acknowledgements
Crank.py is only possible because of years of hard work by the PyScript maintainers. In addition, development was mostly done by Claude Code, who helped me with the tricky FFI support. An interesting note, both Claude and ChatGPT independently suggested the `h.div(className="class")["children"]` syntax during brainstorming for this library. My hope is that this is the first of many language bindings for Crank, so that we might achieve the polyglot browser future which Bernhardt dreamed of.
