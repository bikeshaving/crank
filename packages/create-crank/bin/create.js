#!/usr/bin/env node
import {spawn} from "child_process";

const args = process.argv.slice(2);

// Always use Crank framework
if (!args.includes("--framework")) {
	args.push("--framework", "crank");
}

// Run create-shovel with the args. --yes skips the second install prompt
// (the user already confirmed installing create-crank).
spawn("npx", ["--yes", "create-shovel", ...args], {
	stdio: "inherit",
}).on("exit", (code) => {
	process.exit(code ?? 0);
});
