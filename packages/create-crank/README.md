# create-crank

Create a new [Crank.js](https://crank.js.org) project.

## Usage

```bash
npm create crank my-app
```

This is a shortcut for:

```bash
npm create shovel my-app --template crank
```

## Options

All options are passed through to `create-shovel`:

```bash
# Skip TypeScript prompt
npm create crank my-app --typescript
npm create crank my-app --no-typescript

# Skip platform prompt
npm create crank my-app --platform node
npm create crank my-app --platform bun
npm create crank my-app --platform cloudflare
```

## What you get

A Crank.js project with:

- Server-rendered JSX components using `@b9g/crank/html`
- [Shovel](https://github.com/bikeshaving/shovel) for builds and dev server
- TypeScript support (optional)
- Deploy to Node.js, Bun, or Cloudflare Workers

## Learn more

- [Crank.js Documentation](https://crank.js.org)
- [Shovel Documentation](https://github.com/bikeshaving/shovel)
