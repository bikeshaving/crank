# create-crank

Create a new [Crank.js](https://crank.js.org) project powered by [Shovel](https://github.com/bikeshaving/shovel).

## Usage

```bash
npm create crank
```

Or with a project name:

```bash
npm create crank my-app
```

## Options

All options are passed through to `create-shovel`:

```
--template <name>       hello-world, api, static-site, full-stack
--jsx / --no-jsx        Use JSX syntax or tagged template literals
--typescript / --no-typescript
--platform <name>       node, bun, cloudflare
```

Skip all prompts:

```bash
npm create crank my-app -- --template full-stack --no-jsx --typescript --platform bun
```

## What you get

A Crank.js project with:

- Server-rendered components (JSX or tagged template literals)
- Router-based routing with `@b9g/router`
- [Shovel](https://github.com/bikeshaving/shovel) for builds and dev server
- TypeScript support (optional)
- ESLint configuration
- Deploy to Node.js, Bun, or Cloudflare Workers

## Learn more

- [Crank.js Documentation](https://crank.js.org)
- [Shovel Documentation](https://github.com/bikeshaving/shovel)
