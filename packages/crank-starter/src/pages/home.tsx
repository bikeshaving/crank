/** @jsxImportSource @b9g/crank */
import {Counter} from "../components/counter";

export function HomePage() {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Crank + Shovel</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fafafa;
          }
          main {
            max-width: 640px;
            margin: 4rem auto;
            padding: 2rem;
          }
          h1 { color: #2563eb; margin-bottom: 1rem; }
          p { margin-bottom: 1rem; }
          code {
            background: #e5e7eb;
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-size: 0.9em;
          }
          .counter {
            margin: 2rem 0;
            padding: 1rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          button {
            background: #2563eb;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
          }
          button:hover { background: #1d4ed8; }
        `}</style>
      </head>
      <body>
        <main>
          <h1>Crank + Shovel</h1>
          <p>
            A starter template for building web apps with{" "}
            <a href="https://crank.js.org">Crank.js</a> and{" "}
            <a href="https://github.com/bikeshaving/shovel">Shovel</a>.
          </p>

          <div class="counter">
            <Counter />
          </div>

          <p>
            Edit <code>src/pages/home.tsx</code> to get started.
          </p>
        </main>
      </body>
    </html>
  );
}
