import config from "@b9g/eslint-config";

export default [
	...config,
	{ignores: ["docs/**", "skills/**"]},
	{
		// Examples are written the way users write them: space-indented, and
		// without the repo's TypeScript ceremony.
		files: ["examples/**/*", "website/examples/**/*"],
		rules: {
			// The indent width lives in three rules; a width override must set
			// all of them.
			"@stylistic/indent": ["error", 2],
			"@stylistic/indent-binary-ops": ["error", 2],
			"@stylistic/jsx-indent-props": ["error", 2],
			"@b9g/explicit-declaration-return-type": "off",
		},
	},
	{
		// Tests deliberately write components in non-idiomatic ways.
		files: ["test/**/*"],
		rules: {
			// These tests assert what the renderer receives — exact children,
			// text-node identity across re-renders — not what it prints.
			// Unwrapping {"world"} can keep the rendered output identical while
			// merging the children the test exists to exercise.
			"@stylistic/jsx-curly-brace-presence": "off",
			"crank/prefer-props-iterator": "off",
			"crank/prefer-refresh-callback": "off",
			"crank/require-cleanup-for-timers": "off",
			"crank/no-react-props": "off",
			"crank/no-react-event-props": "off",
		},
	},
];
