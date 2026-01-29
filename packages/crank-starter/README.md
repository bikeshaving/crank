# Crank Starter

A starter template for building web apps with [Crank.js](https://crank.js.org) and [Shovel](https://github.com/bikeshaving/shovel).

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Project Structure

```
crank-starter/
├── src/
│   ├── server.tsx        # Shovel entry point with routes
│   ├── pages/
│   │   └── home.tsx      # Page components (full HTML documents)
│   └── components/
│       └── counter.tsx   # Reusable UI components
├── package.json
├── tsconfig.json
└── README.md
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Run production build

## Learn More

- [Crank.js Documentation](https://crank.js.org)
- [Shovel Documentation](https://github.com/bikeshaving/shovel)
