import {route, Router} from "./router.js";

// I guess this layer of indirection makes it easier to import the router
// in different environments.
export const router = new Router([
	route("/", "home"),
	route("/blog", "blogHome"),
	route("/blog/:slug", "blog"),
	route("/guides/:slug", "guide"),
	route("/playground", "playground"),
]);
