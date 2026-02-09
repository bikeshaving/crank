#!/usr/bin/env node
import {spawn} from "child_process";

const args = process.argv.slice(2);

// Add --template crank if no --template specified
if (!args.includes("--template")) {
	args.push("--template", "crank");
}

// Run create-shovel with the args
spawn("npx", ["create-shovel", ...args], {
	stdio: "inherit",
	shell: true,
}).on("exit", (code) => {
	process.exit(code ?? 0);
});
