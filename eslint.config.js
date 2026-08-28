import config from "@b9g/eslint-config";

export default [
	...config,
	{
		ignores: ["docs/**", "skills/**"],
	},
	{
		files: ["**/*.{js,jsx,ts,tsx}"],
		rules: {
			// Empty interfaces which extend a supertype are extension points for
			// declaration merging (ProvisionMap, EventMap, ChildIterable).
			"@typescript-eslint/no-empty-object-type": [
				"error",
				{allowInterfaces: "with-single-extends"},
			],
			// A tagged template is a call. Tests invoke the jsx tag for its
			// side effects to assert that it throws.
			"@typescript-eslint/no-unused-expressions": [
				"error",
				{allowTaggedTemplates: true},
			],
		},
	},
	{
		// Examples are written the way users write them: space-indented, and
		// without the repo's TypeScript ceremony.
		files: ["examples/**/*", "website/examples/**/*"],
		rules: {
			"@stylistic/indent": ["error", 2],
			"@stylistic/jsx-indent-props": ["error", 2],
			"@b9g/explicit-declaration-return-type": "off",
		},
	},
	{
		// Tests deliberately write components in non-idiomatic ways.
		files: ["test/**/*"],
		rules: {
			// The fixer unwraps {"a"} children. Two of those on adjacent lines
			// become one whitespace-joined text node, which changes rendered
			// output. Tests here assert exact text-node structure, so the
			// failure this causes looks like a hydration bug.
			"@stylistic/jsx-curly-brace-presence": "off",
			"crank/prefer-props-iterator": "off",
			"crank/prefer-refresh-callback": "off",
			"crank/require-cleanup-for-timers": "off",
			"crank/no-react-props": "off",
			"crank/no-react-event-props": "off",
		},
	},
];
