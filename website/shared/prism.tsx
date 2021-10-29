/** @jsx createElement */
import {createElement} from "@b9g/crank";

import Prism from "prismjs";
import type {Token} from "prismjs";

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

function tokenize(text: string, lang: string): Array<Array<Token | string>> {
	const grammar = Prism.languages[lang];
	if (grammar == null) {
		return text.split(/\r\n|\r|\n/).map((text) => [text]);
	}

	const tokens = Prism.tokenize(text, grammar);
	return splitLines(tokens);
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

function printLines(lines: Array<Array<Token | string>>): Array<Element> {
	return lines.map((line) => {
		const length = line.reduce((l, t) => l + t.length, 0);
		return (
			<div>
				<code>{printTokens(line)}</code>
				{!!length || <br />}
			</div>
		);
	});
}

export function CodeBlock({code, lang}: {code: string; lang: string}) {
	const i = lang.indexOf(" ");
	let rest = "";
	if (i !== -1) {
		lang = lang.slice(0, i);
		rest = lang.slice(i);
	}

	const tokens = tokenize(code, lang);
	const langClassName = lang ? `language-${lang}` : null;
	return (
		<pre
			className={langClassName}
			contenteditable={rest.includes("live") ? "true" : "false"}
		>
			{printLines(tokens)}
		</pre>
	);
}
