import {route, Router} from "./router.js";
import HomeView from "./views/home.js";
import BlogHomeView from "./views/blog-home.js";
import GuideView from "./views/guide.js";
import BlogView from "./views/blog.js";
import PlaygroundView from "./views/playground.js";
import PlaygroundPreviewView from "./views/playground-preview.js";

// TODO: I am not sure what the value of the route() function is over using the
// route config directly.
export const router = new Router([
	route("/", {
		name: "home",
		view: HomeView,
	}),
	route("/blog", {
		name: "blog-home",
		view: BlogHomeView,
	}),
	route("/blog/:slug", {
		name: "blog",
		view: BlogView,
	}),
	route("/guides/:slug", {
		name: "guide",
		view: GuideView,
	}),
	route("/playground", {
		name: "playground",
		view: PlaygroundView,
	}),
	route("/playground-preview", {
		name: "playground-preview",
		view: PlaygroundPreviewView,
	}),
]);
