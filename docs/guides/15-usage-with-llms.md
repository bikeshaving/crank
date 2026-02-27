---
title: Usage with LLMs
description: How to get AI coding assistants to write idiomatic Crank components using the official skill file, standalone artifacts, and effective prompting techniques.
---

AI coding assistants work best with Crank when they have access to the
framework’s spec and patterns. The **Crank skill** bundles everything an LLM
needs into a single file you can install once and forget about.

## The Crank Skill

The skill is a Markdown document that packages Crank’s component specification,
style guide, and worked examples into one file. It teaches AI assistants the
framework’s idioms (generators for state, `this.refresh()` for updates,
async functions for data fetching) so they produce code that actually works
instead of guessing based on React patterns.

Download the latest skill: [crank.js.org/skill](https://crank.js.org/skill)

The skill is also attached to every
[GitHub release](https://github.com/bikeshaving/crank/releases) as a zip
archive.

## Installing in Claude Code

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) can load skills
automatically. Download and unzip the skill into your global skills directory:

```shell
curl -L https://crank.js.org/skill -o /tmp/crank-skill.zip
unzip -o /tmp/crank-skill.zip -d ~/.claude/skills/
```

This creates `~/.claude/skills/crank-component-authoring/SKILL.md`, which
Claude Code picks up in every project.

For a **project-scoped** install, unzip into `.claude/skills/` at the root of
your repository instead. This is useful when you want the skill checked into
version control so every contributor gets it automatically.

## Single-File Artifacts

The standalone `jsx` tag is ideal for LLM-generated artifacts: no build step,
a single `<script type="module">`, and it runs directly in the browser. When
you ask an assistant to produce a self-contained demo, this is the format you
want.

A minimal template:

```html
<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>Crank App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import {jsx, renderer} from "https://cdn.jsdelivr.net/npm/@b9g/crank/standalone.js";

    function *Counter() {
      let count = 0;
      const onclick = () => this.refresh(() => count++);

      for ({} of this) {
        yield jsx`
          <button onclick=${onclick}>Count: ${count}</button>
        `;
      }
    }

    renderer.render(jsx`<${Counter} />`, document.getElementById("app"));
  </script>
</body>
</html>
```

See the [JSX Template Tag](/guides/jsx-template-tag/) guide for full details on
the standalone module.

## Tips for Prompting

A few small additions to your prompts go a long way:

- **Pin the version.** Mention “Crank 0.7.8” (or whatever you’re using) so
  the assistant doesn’t confuse APIs across versions.
- **Name the pattern you want.** Saying “use a generator component with
  `this.refresh()`“ is more reliable than “make it stateful.”
- **Ask for standalone output.** If you want a single HTML file, say so
  explicitly, otherwise the assistant may assume a bundler.
- **Reference the guides.** Phrases like “follow the Crank style guide” or
  “use async components for data fetching” help steer the output toward
  idiomatic patterns.

## Without the Skill

If you’re using a tool that doesn’t support skill files, you can still get good
results by giving the model context manually.

### Paste the quick-reference table

Copy this into your conversation so the assistant knows the basics:

| React | Crank | Why |
|---|---|---|
| `onClick` | `onclick` | Lowercase DOM event names |
| `className` | `class` | Standard HTML attributes |
| `htmlFor` | `for` | Standard HTML attributes |
| `dangerouslySetInnerHTML` | `innerHTML` | Direct DOM property |
| `useState(init)` | `let x = init` | Variable in generator scope |
| `setState(val)` | `this.refresh(() => x = val)` | Explicit refresh |
| `useEffect(fn, [])` | Code before first `yield` | Generator mount phase |
| `useEffect(() => cleanup)` | Code after `for` loop | Generator cleanup |
| `useRef(null)` | `let el = null` + `ref={n => el = n}` | Variable + ref prop |
| `useContext(ctx)` | `this.consume(key)` | No Provider components |

### Link the full references

For deeper context, paste or link to these documents:

- [Component Specification](/spec/): complete API reference covering all
  component types, lifecycle, context methods, and async behavior
- [Style Guide](/guides/crank-style-guide/): do/don’t patterns for
  component structure, state updates, props, cleanup, and error handling
- [Reference for React Developers](/guides/reference-for-react-developers/):
  side-by-side mapping of React patterns to Crank equivalents
