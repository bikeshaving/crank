import index from "./index.html";

const server = Bun.serve({
	port: Number(process.env.PORT || 8000),
	routes: {"/": index},
	development: {hmr: true},
});
// eslint-disable-next-line no-console
console.log(server.url.href);
