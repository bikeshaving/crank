# Contributing to Crank

Thank you for your interest in contributing to Crank! This guide will help you get started with development.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/bikeshaving/crank.git
   cd crank
   ```

2. **Install dependencies**
   Crank uses [Bun](https://bun.sh) for development. Make sure you have Bun installed, then run:

   ```bash
   bun install
   ```

## Scripts

- **`bun run build`** - Build the project (cleans first)
- **`bun run clean`** - Remove the dist directory
- **`bun run lint`** - Run ESLint on all files
- **`bun run test`** - Run tests using Playwright and uvu
- **`bun run typecheck`** - Run TypeScript type checking

## Project Structure

- **`src/`** - Core library source code
- **`test/`** - Test files
- **`examples/`** - Example applications
- **`website/`** - Documentation website source
- **`packages/`** - Workspace packages
- **`dist/`** - Built files (generated)

## Testing

Tests are run using [playwright-test](https://github.com/hugomrdias/playwright-test) with the uvu test runner. Test files are located in the `test/` directory.

To run tests, use:

```bash
bun run test
bun run test --watch --debug
```

To run a specific test file, you can specify the path:

```bash
bun run test test/dom.tsx
```

## Code Style

- The project uses ESLint with TypeScript support
- Prettier is configured for code formatting
- Follow existing code patterns and conventions

## TypeScript

Crank is written in TypeScript. Make sure all code is properly typed and passes type checking.

```bash
bun run typecheck
```

## Questions?

For questions about contributing, please open a discussion on GitHub or refer
to the project documentation at https://crank.js.org.
