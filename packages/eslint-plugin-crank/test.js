const {RuleTester} = require("eslint");
const rule = require("./index.js").rules["generator-destructuring-consistency"];

const ruleTester = new RuleTester({
	parser: require.resolve("@typescript-eslint/parser"),
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
		ecmaFeatures: {
			jsx: true,
		},
	},
});

ruleTester.run("generator-destructuring-consistency", rule, {
	valid: [
		// Consistent empty destructuring
		{
			code: `
				function* Component({}) {
					for ({} of this) {
						console.log("hello");
					}
				}
			`,
		},
		// Consistent single property destructuring
		{
			code: `
				function* Component({children}) {
					for ({children} of this) {
						yield children;
					}
				}
			`,
		},
		// Consistent multiple property destructuring
		{
			code: `
				function* Component({name, age}) {
					for ({name, age} of this) {
						yield \`\${name} is \${age}\`;
					}
				}
			`,
		},
		// Consistent with const declaration
		{
			code: `
				function* Component({message}) {
					for (const {message} of this) {
						yield message;
					}
				}
			`,
		},
		// Non-generator function (should be ignored)
		{
			code: `
				function Component({children}) {
					for ({} of this) {
						return "Hello";
					}
				}
			`,
		},
		// Lowercase function name (should be ignored - not component-like)
		{
			code: `
				function* helper({children}) {
					for ({} of this) {
						yield children;
					}
				}
			`,
		},
		// No destructuring in first param (should be ignored)
		{
			code: `
				function* Component(props) {
					for ({children} of this) {
						yield props.children;
					}
				}
			`,
		},
		// Function without this context loops (should be ignored)
		{
			code: `
				function* Component({children}) {
					yield children;
				}
			`,
		},
		// Consistent with for await
		{
			code: `
				async function* Component({message}) {
					for await ({message} of this) {
						yield message;
					}
				}
			`,
		},
		// Consistent empty destructuring with for await
		{
			code: `
				async function* Component({}) {
					for await ({} of this) {
						yield "hello";
					}
				}
			`,
		},
		// Property renaming - should be consistent (same source props)
		{
			code: `
				function* Component({children: newChildren}) {
					for (const {children: otherName} of this) {
						yield otherName;
					}
				}
			`,
		},
		// Multiple property renaming
		{
			code: `
				function* Component({name: userName, age: userAge}) {
					for (const {name: currentName, age: currentAge} of this) {
						yield \`\${currentName} is \${currentAge}\`;
					}
				}
			`,
		},
		// Mixed renaming and regular destructuring with let
		{
			code: `
				function* Component({children, name: originalName}) {
					let currentName;
					for ({children, name: currentName} of this) {
						yield children + currentName;
					}
				}
			`,
		},
		// Complex mixed pattern with let
		{
			code: `
				function* Component({id, name: originalName, data}) {
					for (let {id, name: currentName, data} of this) {
						yield \`\${id}: \${currentName} - \${data}\`;
					}
				}
			`,
		},
		// Using ctx (second parameter) instead of this
		{
			code: `
				function* Component({children}, ctx) {
					for ({children} of ctx) {
						yield children;
					}
				}
			`,
		},
		// Mixed this and ctx usage (both should work)
		{
			code: `
				function* Component({name, age}, ctx) {
					for ({name, age} of this) {
						yield name;
					}
					for ({name, age} of ctx) {
						yield age;
					}
				}
			`,
		},
	],

	invalid: [
		// Empty param but destructured loop
		{
			code: `
				function* Component({}) {
					for ({children} of this) {
						yield children;
					}
				}
			`,
			errors: [
				{
					messageId: "inconsistentDestructuring",
					data: {
						expected: "{}",
						actual: "{children}",
					},
				},
			],
			output: `
				function* Component({}) {
					for ({} of this) {
						yield children;
					}
				}
			`,
		},
		// Destructured param but empty loop
		{
			code: `
				function* Component({children}) {
					for ({} of this) {
						yield children;
					}
				}
			`,
			errors: [
				{
					messageId: "inconsistentDestructuring",
					data: {
						expected: "{children}",
						actual: "{}",
					},
				},
			],
			output: `
				function* Component({children}) {
					for ({children} of this) {
						yield children;
					}
				}
			`,
		},
		// Different properties
		{
			code: `
				function* Component({name, age}) {
					for ({message} of this) {
						yield message;
					}
				}
			`,
			errors: [
				{
					messageId: "inconsistentDestructuring",
					data: {
						expected: "{age, name}",
						actual: "{message}",
					},
				},
			],
			output: `
				function* Component({name, age}) {
					for ({age, name} of this) {
						yield message;
					}
				}
			`,
		},
		// With const declaration
		{
			code: `
				function* Component({children}) {
					for (const {} of this) {
						yield children;
					}
				}
			`,
			errors: [
				{
					messageId: "inconsistentDestructuring",
					data: {
						expected: "{children}",
						actual: "{}",
					},
				},
			],
			output: `
				function* Component({children}) {
					for (const {children} of this) {
						yield children;
					}
				}
			`,
		},
		// Multiple loops with inconsistencies
		{
			code: `
				function* Component({name}) {
					for ({} of this) {
						yield "First";
					}
					for ({age} of this) {
						yield "Second";
					}
				}
			`,
			errors: [
				{
					messageId: "inconsistentDestructuring",
					data: {
						expected: "{name}",
						actual: "{}",
					},
				},
				{
					messageId: "inconsistentDestructuring",
					data: {
						expected: "{name}",
						actual: "{age}",
					},
				},
			],
			output: `
				function* Component({name}) {
					for ({name} of this) {
						yield "First";
					}
					for ({name} of this) {
						yield "Second";
					}
				}
			`,
		},
		// for await inconsistency
		{
			code: `
				async function* Component({message}) {
					for await ({} of this) {
						yield message;
					}
				}
			`,
			errors: [
				{
					messageId: "inconsistentDestructuring",
					data: {
						expected: "{message}",
						actual: "{}",
					},
				},
			],
			output: `
				async function* Component({message}) {
					for await ({message} of this) {
						yield message;
					}
				}
			`,
		},
		// Mixed for and for await inconsistency
		{
			code: `
				async function* Component({data}) {
					for ({} of this) {
						yield "sync";
					}
					for await ({value} of this) {
						yield "async";
					}
				}
			`,
			errors: [
				{
					messageId: "inconsistentDestructuring",
					data: {
						expected: "{data}",
						actual: "{}",
					},
				},
				{
					messageId: "inconsistentDestructuring",
					data: {
						expected: "{data}",
						actual: "{value}",
					},
				},
			],
			output: `
				async function* Component({data}) {
					for ({data} of this) {
						yield "sync";
					}
					for await ({data} of this) {
						yield "async";
					}
				}
			`,
		},
		// Property renaming with wrong source props (should error)
		{
			code: `
				function* Component({children: newChildren}) {
					for (const {name: otherName} of this) {
						yield otherName;
					}
				}
			`,
			errors: [
				{
					messageId: "inconsistentDestructuring",
					data: {
						expected: "{children}",
						actual: "{name}",
					},
				},
			],
			output: `
				function* Component({children: newChildren}) {
					for (const {children} of this) {
						yield otherName;
					}
				}
			`,
		},
		// Mixed pattern with inconsistent source props
		{
			code: `
				function* Component({id, name: userName}) {
					for (let {id, age: currentAge} of this) {
						yield \`\${id} - \${currentAge}\`;
					}
				}
			`,
			errors: [
				{
					messageId: "inconsistentDestructuring",
					data: {
						expected: "{id, name}",
						actual: "{age, id}",
					},
				},
			],
			output: `
				function* Component({id, name: userName}) {
					for (let {id, name} of this) {
						yield \`\${id} - \${currentAge}\`;
					}
				}
			`,
		},
		// ctx parameter inconsistency
		{
			code: `
				function* Component({children}, ctx) {
					for ({name} of ctx) {
						yield name;
					}
				}
			`,
			errors: [
				{
					messageId: "inconsistentDestructuring",
					data: {
						expected: "{children}",
						actual: "{name}",
					},
				},
			],
			output: `
				function* Component({children}, ctx) {
					for ({children} of ctx) {
						yield name;
					}
				}
			`,
		},
		// Mixed this/ctx with inconsistency
		{
			code: `
				function* Component({data}, ctx) {
					for ({data} of this) {
						yield "correct";
					}
					for ({wrong} of ctx) {
						yield "incorrect";
					}
				}
			`,
			errors: [
				{
					messageId: "inconsistentDestructuring",
					data: {
						expected: "{data}",
						actual: "{wrong}",
					},
				},
			],
			output: `
				function* Component({data}, ctx) {
					for ({data} of this) {
						yield "correct";
					}
					for ({data} of ctx) {
						yield "incorrect";
					}
				}
			`,
		},
	],
});

console.log("All tests passed!");
