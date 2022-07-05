import {createServer} from "node:http";
import {router} from "./routes.js";

const server = createServer((req, res) => {
	const match = router.match(req.url || "");
	if (!match) {
		res.writeHead(404, {"Content-Type": "text/html"});
		res.end("Page not found", "utf-8");
		return;
	}

	res.writeHead(200, {"Content-Type": "text/html"});
	res.end("Hello world", "utf-8");
});

const PORT = 1337;
console.info(`Server is listening on port ${PORT}`);
server.listen(PORT);
