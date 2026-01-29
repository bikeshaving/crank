/** @jsxImportSource @b9g/crank */
import {Router} from "@b9g/router";
import {renderer} from "@b9g/crank/html";
import {HomePage} from "./pages/home";

const router = new Router();

// View helper: Component → Request Handler
async function htmlResponse(element: unknown): Promise<Response> {
	const html = await renderer.render(element);
	return new Response(`<!DOCTYPE html>${html}`, {
		headers: {"Content-Type": "text/html"},
	});
}

// Routes
router.route("/").get(async () => {
	return htmlResponse(<HomePage />);
});

// API example
router.route("/api/time").get(() => {
	return Response.json({
		time: new Date().toISOString(),
	});
});

// 404 handler
router.route("/*").all(() => {
	return new Response("Not Found", {status: 404});
});

// ServiceWorker fetch handler
declare const self: ServiceWorkerGlobalScope;
self.addEventListener("fetch", (event) => {
	event.respondWith(router.handle(event.request));
});
