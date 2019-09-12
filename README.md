# Why am I making another component framework? Are you crazy?

Let me just get this out of the way. Yes I am crazy. I’m making a component framework because I like React but I really don’t like the direction it’s headed in and I wanted something simpler, more idiomatic to modern javascript. React doesn’t use promises, async/await or iterators/generators despite the fact that these constructs solve many of the problems React hooks and fiber were designed to solve.

- All lifecycle methods/hooks are easy to express within the context of (async) generator functions.
