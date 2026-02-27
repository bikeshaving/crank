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
instead of guessing based on inconsistent training data.

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

## Without the Skill

If you’re using a tool that doesn’t support skill files, you can still get good
results by giving the model context manually.

Paste or link to these documents so the assistant has enough context:

- [Component Specification](/spec/): complete API reference covering all
  component types, lifecycle, context methods, and async behavior
- [Style Guide](/guides/crank-style-guide/): do/don’t patterns for
  component structure, state updates, props, cleanup, and error handling
- [Reference for React Developers](/guides/reference-for-react-developers/):
  side-by-side mapping of React patterns to Crank equivalents
