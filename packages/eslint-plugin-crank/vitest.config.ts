import {defineConfig} from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/__tests__/**/*.ts", "src/**/?(*.)+(spec|test).ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov", "html"],
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.d.ts", "src/**/__tests__/**"],
		},
	},
});
