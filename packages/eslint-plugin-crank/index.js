module.exports = {
	configs: {
		recommended: {
			plugins: ["react"],
			settings: {
				react: {
					pragma: "createElement",
					fragment: "Fragment",
				},
			},
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
			rules: {
				// A common Crank idiom is to destructure the context iterator values
				// with an empty pattern.
				//   for (const {} of this) {}
				// TODO: Write a rule that checks for empty patterns outside of this
				// context.
				"no-empty-pattern": 0,
				"react/jsx-uses-react": 2,
				"react/jsx-uses-vars": 2,
				"react/jsx-no-undef": 2,
				"react/jsx-no-duplicate-props": 2,
			},
		},
	},
};
