/** @jsx createElement */
import Prism from "prismjs";
import type {Token} from "prismjs";
import {createElement} from "@b9g/crank";
import type {Element} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom.js";

// TODO: lazily import these?
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-diff";
import "prismjs/components/prism-bash";

// @ts-ignore
Prism.manual = true;
function wrapContent(
	content: Array<Token | string> | Token | string,
): Array<Token | string> {
	return Array.isArray(content) ? content : [content];
}

function unwrapContent(
	content: Array<Token | string>,
): Array<Token | string> | string {
	if (content.length === 0) {
		return "";
	} else if (content.length === 1 && typeof content[0] === "string") {
		return content[0];
	}

	return content;
}

function splitLinesRec(
	tokens: Array<Token | string>,
): Array<Array<Token | string>> {
	let currentLine: Array<Token | string> = [];
	const lines: Array<Array<Token | string>> = [currentLine];
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (typeof token === "string") {
			const split = token.split(/\r\n|\r|\n/);
			for (let j = 0; j < split.length; j++) {
				if (j > 0) {
					lines.push((currentLine = []));
				}

				const token1 = split[j];
				if (token1) {
					currentLine.push(token1);
				}
			}
		} else {
			const split = splitLinesRec(wrapContent(token.content));
			if (split.length > 1) {
				for (let j = 0; j < split.length; j++) {
					if (j > 0) {
						lines.push((currentLine = []));
					}

					const line = split[j];
					if (line.length) {
						const token1 = new Prism.Token(
							token.type,
							unwrapContent(line),
							token.alias,
						);
						token1.length = line.reduce((l, t) => l + t.length, 0);
						currentLine.push(token1);
					}
				}
			} else {
				currentLine.push(token);
			}
		}
	}

	return lines;
}

function splitLines(
	tokens: Array<Token | string>,
): Array<Array<Token | string>> {
	const lines = splitLinesRec(tokens);
	// Dealing with trailing newlines
	if (!lines[lines.length - 1].length) {
		lines.pop();
	}

	return lines;
}

// https://github.com/PrismJS/prism/blob/a80a68ba507dae20f007a0817d9812f8eebcc5ce/components/prism-core.js#L22
const lang = /\blang(?:uage)?-([\w-]+)\b/i;
// TOOD: type el
function getLanguage(el: any): string {
	while (el && !lang.test(el.className)) {
		el = el.parentElement;
	}

	if (el) {
		return (el.className.match(lang) || [null, "none"])[1].toLowerCase();
	}

	return "none";
}

function tokenize(
	text: string,
	language: string,
): Array<Array<Token | string>> {
	return splitLines(Prism.tokenize(text, Prism.languages[language]));
}

function printTokens(tokens: Array<Token | string>): Array<Element | string> {
	const result: Array<Element | string> = [];
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (typeof token === "string") {
			result.push(token);
		} else {
			const children = Array.isArray(token.content)
				? printTokens(token.content)
				: token.content;
			let className = "token " + token.type;
			if (Array.isArray(token.alias)) {
				className += " " + token.alias.join(" ");
			} else if (typeof token.alias === "string") {
				className += " " + token.alias;
			}

			result.push(<span class={className}>{children}</span>);
		}
	}

	return result;
}

function printLines(
	lines: Array<Array<Token | string>>,
	language: string,
	//keyer: Keyer,
): Array<Element> {
	//let cursor = 0;
	return lines.map((line) => {
		//const key = keyer.keyAt(cursor);
		//const length = line.reduce((l, t) => l + t.length, 0);
		//cursor += length + 1;
		return (
			<div class={`language-${language}`}>
				<code>{printTokens(line)}</code>
				<br />
			</div>
		);
	});
}

// https://github.com/PrismJS/prism/blob/a80a68ba507dae20f007a0817d9812f8eebcc5ce/components/prism-core.js#L502
const selector =
	'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code';

function CodeBlock({code, language}: {code: string; language: string}) {
	const tokens = tokenize(code, language);
	return <div contenteditable="true">{printLines(tokens, language)}</div>;
}

for (const el of Array.from(document.querySelectorAll(selector))) {
	const language = getLanguage(el);
	// Set language on the element, if not present
	//	el.className = el.className.replace(language, '').replace(/\s+/g, ' ') + ' language-' + language;
	//
	// This is causing an FOUC for some reason.
	// Set language on the parent, for styling
	//const parent = el.parentElement;
	//if (parent && parent.nodeName.toLowerCase() === 'pre') {
	//	parent.className = parent.className.replace(language, '').replace(/\s+/g, ' ') + ' language-' + language;
	//}

	renderer.render(
		<CodeBlock code={el.textContent || ""} language={language} />,
		el.parentNode!,
	);
}
