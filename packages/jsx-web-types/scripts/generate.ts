#!/usr/bin/env bun
/**
 * Comprehensive JSX DOM Type Generator
 *
 * Generates accurate and complete JSX type definitions by intelligently combining:
 * - HTML attributes from MDN browser compatibility data
 * - Direct reference to TypeScript's DOM interfaces
 *
 * This approach produces JSX types that stay automatically synchronized with
 * TypeScript's DOM definitions while adding JSX-specific attribute support.
 */

// TODO: just use bun
import * as FS from "fs";
import * as Path from "path";
import BCD from "@mdn/browser-compat-data" with {type: "json"};
import AriaData from "aria-data" with {type: "json"};
import {Project} from "ts-morph";
import * as cheerio from "cheerio";
import prettier from "prettier";
import {createRequire} from "module";

const nodeRequire = createRequire(import.meta.url);

// Locate the real TypeScript install's lib.dom.d.ts rather than assuming a
// node_modules layout. require.resolve can land in a package store that omits
// the bundled lib files (e.g. Bun's .bun store), so we also walk up from this
// script looking for node_modules/typescript/lib, which handles hoisting.
function resolveDOMLib(): string {
	const candidates: string[] = [];
	// Walk up from this script looking for a real node_modules/typescript/lib
	// (handles package-local installs and monorepo hoisting). Preferred over
	// require.resolve, which can point into a package store whose lib files
	// ts-morph's filesystem can't read (e.g. Bun's .bun store).
	let dir = Path.dirname(import.meta.url.replace("file://", ""));
	for (let i = 0; i < 6; i++) {
		candidates.push(Path.join(dir, "node_modules", "typescript", "lib", "lib.dom.d.ts"));
		dir = Path.dirname(dir);
	}
	try {
		candidates.push(
			Path.join(Path.dirname(nodeRequire.resolve("typescript/package.json")), "lib", "lib.dom.d.ts"),
		);
	} catch {}
	for (const candidate of candidates) {
		if (FS.existsSync(candidate)) return candidate;
	}
	throw new Error(`Could not locate lib.dom.d.ts. Tried:\n${candidates.join("\n")}`);
}
const DOM_LIB_PATH = resolveDOMLib();
// Resolve data files relative to this script, never the current directory.
const DATA_DIR = Path.resolve(
	Path.dirname(import.meta.url.replace("file://", "")),
	"../data",
);

interface MarkupInfo {
	name: string;
	attributes: Map<string, AttributeInfo>;
	elements: Map<string, Map<string, AttributeInfo>>;
}

interface AttributeInfo {
	description?: string;
	type?: string;
	deprecated?: boolean;
	experimental?: boolean;
	mdnURL?: string;
	example?: string;
}


// Load global attributes from MDN documentation
let GLOBAL_ATTRIBUTES: Map<string, {description: string; status?: string}> = new Map();

// Universal global attributes: those BCD lists as global in BOTH the HTML and
// SVG namespaces. Their intersection — autofocus, class, id, lang, style,
// tabindex — applies across HTML, SVG, and MathML, so they belong on the shared
// GlobalAttributes interface. We derive them from the HTML∩SVG intersection
// (BCD's per-namespace global_attributes omits them for MathML), which keeps
// every namespace consistent without a separate dependency or a hand-coded list.
function bcdGlobalAttributeNames(namespace: "html" | "svg"): string[] {
	return Object.keys(BCD[namespace].global_attributes).filter(
		(attr) =>
			attr !== "__compat" && attr !== "data_attributes" && !attr.includes("_"),
	);
}
const UNIVERSAL_GLOBAL_ATTRIBUTES = bcdGlobalAttributeNames("html")
	.filter((attr) => bcdGlobalAttributeNames("svg").includes(attr))
	.sort();

function generateUniversalGlobalAttributeEntries(): string {
	return UNIVERSAL_GLOBAL_ATTRIBUTES.map((attr) => {
		const meta = GLOBAL_ATTRIBUTES.get(attr);
		const jsdoc = meta?.description
			? `/** ${meta.description.replace(/\*\//g, "*\\/").replace(/\s+/g, " ").trim()} */\n`
			: "";
		const key = attr.includes("-") ? `"${attr}"` : attr;
		return `${jsdoc}${key}?: JSXAttributeValue;`;
	}).join("\n");
}

// Global attribute descriptions flow through the same MDN scraping + on-disk
// cache pipeline as every other description (fetchMDNDescription), so there is
// no hand-maintained data file to drift. The attribute names themselves come
// from BCD (see UNIVERSAL_GLOBAL_ATTRIBUTES). Requires loadMDNCache() to have
// run first.
const GLOBAL_ATTRIBUTE_DOCS_BASE =
	"https://developer.mozilla.org/docs/Web/HTML/Global_attributes/";

async function loadGlobalAttributeDescriptions(): Promise<
	Map<string, {description: string; status?: string}>
> {
	const attrs = new Map<string, {description: string; status?: string}>();
	for (const attr of UNIVERSAL_GLOBAL_ATTRIBUTES) {
		const description = await fetchMDNDescription(
			GLOBAL_ATTRIBUTE_DOCS_BASE + attr,
		);
		if (description) {
			attrs.set(attr, {description});
		}
	}
	return attrs;
}

const markupNames = {html: "HTML", svg: "SVG", mathml: "MathML"};

// Cache for MDN descriptions to avoid duplicate fetches
const mdnDescriptionCache = new Map<string, string | undefined>();

// Cache for MDN examples to avoid duplicate extraction
const mdnExampleCache = new Map<string, string | undefined>();

// Persistent on-disk cache of scraped MDN descriptions/examples. Generation
// stays deterministic and offline-capable: a URL is only fetched if it's not
// already cached, and the cache is committed alongside the generated output so
// regenerating doesn't silently degrade JSDoc when MDN's markup shifts.
const MDN_CACHE_PATH = Path.join(DATA_DIR, "mdn-cache.json");

function loadMDNCache(): void {
	try {
		const raw = JSON.parse(FS.readFileSync(MDN_CACHE_PATH, "utf8"));
		for (const [url, desc] of Object.entries(raw.descriptions ?? {})) {
			mdnDescriptionCache.set(url, desc === null ? undefined : (desc as string));
		}
		for (const [url, ex] of Object.entries(raw.examples ?? {})) {
			mdnExampleCache.set(url, ex === null ? undefined : (ex as string));
		}
		console.log(`💾 Loaded ${mdnDescriptionCache.size} cached MDN descriptions`);
	} catch {
		console.log("💾 No MDN cache found; descriptions will be fetched fresh");
	}
}

function saveMDNCache(): void {
	// Sort keys so the committed cache file has stable, reviewable diffs.
	const descriptions: Record<string, string | null> = {};
	for (const url of [...mdnDescriptionCache.keys()].sort()) {
		descriptions[url] = mdnDescriptionCache.get(url) ?? null;
	}
	const examples: Record<string, string | null> = {};
	for (const url of [...mdnExampleCache.keys()].sort()) {
		examples[url] = mdnExampleCache.get(url) ?? null;
	}
	const _comment =
		"AUTO-GENERATED cache of scraped MDN descriptions/examples — do not edit by hand. Managed by scripts/generate.ts.";
	FS.writeFileSync(
		MDN_CACHE_PATH,
		JSON.stringify({_comment, descriptions, examples}, null, 2) + "\n",
	);
	console.log(`💾 Saved ${Object.keys(descriptions).length} MDN descriptions to cache`);
}

/**
 * Extract code examples from MDN URL using cheerio
 */
async function extractMDNExample(url: string, $: cheerio.CheerioAPI): Promise<string | undefined> {
	// Check cache first
	if (mdnExampleCache.has(url)) {
		return mdnExampleCache.get(url);
	}
	
	// Check if this is a fragment URL (pointing to specific attribute within element page)
	const isFragmentURL = url.includes('#');
	const fragment = isFragmentURL ? url.split('#')[1] : null;
	
	// Try multiple selectors to find code examples
	let selectors: string[];
	if (isFragmentURL && fragment) {
		// For fragment URLs, look around the fragment target for attribute-specific examples
		selectors = [
			`#${fragment} + dd pre code`,  // Code in definition description
			`#${fragment} + dd code`,      // Inline code in definition description
			`#${fragment} + dd pre`,       // Pre blocks in definition description
			`#attr-${fragment} + dd pre code`,  // Some use attr- prefix
			`#attr-${fragment} + dd code`,
			`#attr-${fragment} + dd pre`,
			`[id="${fragment}"] + dd pre code`,  // Exact ID match
			`[id="${fragment}"] + dd code`,
			`[id="${fragment}"] + dd pre`,
			`dt#${fragment} + dd pre code`,  // Definition term with ID + examples
			`dt#${fragment} + dd code`,
			`dt#${fragment} + dd pre`,
		];
	} else {
		// For direct attribute pages, use broader selectors
		selectors = [
			'pre code',
			'.code-example code',
			'.example-good code',
			'.example-bad code', 
			'code[class*="language-"]',
			'pre[class*="language-"]',
			'code',
			'pre'
		];
	}
	
	// Collect code examples
	const examples: string[] = [];
	for (const selector of selectors) {
		$(selector).each((_, element) => {
			const code = $(element).text().trim();
			if (code && code.length > 10 && code.length < 500) {
				// Filter for HTML/JSX-like examples that show attribute usage
				if (code.includes('<') && code.includes('>') && 
					(fragment && code.toLowerCase().includes(fragment) || 
					 code.includes('=') || 
					 code.includes('"') ||
					 code.includes("'"))) {
					examples.push(code);
				}
			}
		});
	}
	
	// Return the first relevant example
	const example = examples.length > 0 ? examples[0] : undefined;
	mdnExampleCache.set(url, example);
	return example;
}

/**
 * Fetch and parse description from MDN URL using cheerio
 */
async function fetchMDNDescription(url: string): Promise<string | undefined> {
	// Check cache first
	if (mdnDescriptionCache.has(url)) {
		return mdnDescriptionCache.get(url);
	}
	
	try {
		console.log(`🔍 Fetching description from: ${url}`);
		const response = await fetch(url);
		if (!response.ok) {
			console.warn(`❌ Failed to fetch ${url}: ${response.status}`);
			mdnDescriptionCache.set(url, undefined);
			return undefined;
		}
		
		const html = await response.text();
		const $ = cheerio.load(html);
		
		// Extract example while we have the parsed HTML
		await extractMDNExample(url, $);
		
		// Check if this is a fragment URL (pointing to specific attribute within element page)
		const isFragmentURL = url.includes('#');
		const fragment = isFragmentURL ? url.split('#')[1] : null;
		
		// Try multiple selectors to find paragraphs
		let selectors: string[];
		if (isFragmentURL && fragment) {
			// For fragment URLs, look around the fragment target for attribute-specific content
			selectors = [
				`#${fragment} + dd`,  // Definition description right after the attribute term
				`#${fragment} + dd p`,  // Paragraph within the definition description
				`#${fragment} + dd > *`,  // Any content within the definition description
				`#attr-${fragment} + dd`,  // Some use attr- prefix
				`#attr-${fragment} + dd p`,
				`[id="${fragment}"] + dd`,  // Exact ID match
				`[id="${fragment}"] + dd p`,
				`[id="${fragment}"] + dd > *`,
				`dt#${fragment} + dd`,  // Definition term with ID + description
				`dt#${fragment} + dd p`,
				`dt#${fragment} + dd > *`,
			];
		} else {
			// For direct attribute pages, use original selectors
			selectors = [
				'#summary + p',
				'.main-page-content p',
				'.section-content p',
				'article p',
				'main p'
			];
		}
		
		// Collect all potential paragraphs using cheerio's .text() for clean text extraction
		const paragraphs: string[] = [];
		for (const selector of selectors) {
			$(selector).each((_, element) => {
				const text = $(element).text().trim(); // cheerio's .text() automatically strips HTML tags
				if (text && text.length > 30) {
					paragraphs.push(text);
				}
			});
		}
		
		// Look for "The [attribute] attribute..." pattern
		for (const paragraph of paragraphs) {
			const text = paragraph.trim();
			
			// Look for the standard MDN attribute description pattern
			if (text.match(/^The \w+.*attribute/i)) {
				// Clean up and extract first sentence
				const cleaned = text
					.replace(/\s+/g, ' ')
					.replace(/\n/g, ' ')
					.trim();
				
				// Extract first sentence (look for sentence ending punctuation)
				const sentenceMatch = cleaned.match(/^[^.!?]*[.!?]/);
				const firstSentence = sentenceMatch ? sentenceMatch[0].trim() : cleaned;
				
				mdnDescriptionCache.set(url, firstSentence);
				return firstSentence;
			}
		}
		
		console.warn(`⚠️ No description found in ${url}`);
		mdnDescriptionCache.set(url, undefined);
		return undefined;
	} catch (error) {
		console.warn(`❌ Error fetching ${url}:`, error);
		mdnDescriptionCache.set(url, undefined);
		return undefined;
	}
}
async function analyzeMDNData(): Promise<Map<string, MarkupInfo>> {
	const result = new Map<string, MarkupInfo>();
	
	// Collect all unique URLs that need to be fetched
	const urlsToFetch = new Set<string>();
	
	// First pass: collect structure and URLs
	for (const name of ["html", "svg", "mathml"] as const) {
		const markupName = markupNames[name];
		const markupInfo: MarkupInfo = {
			name: markupName,
			attributes: new Map<string, AttributeInfo>(),
			elements: new Map<string, Map<string, AttributeInfo>>(),
		};
		
		// Collect global attribute URLs
		for (const [attrName, attrData] of Object.entries(BCD[name].global_attributes)) {
			if (attrName.includes("_")) continue;
			
			const compat = (attrData as any).__compat;
			const mdnURL = compat?.mdn_url;
			if (mdnURL) urlsToFetch.add(mdnURL);
		}
		
		// Collect element-specific attribute URLs
		for (const [tagName, elementData] of Object.entries(BCD[name].elements)) {
			if (tagName.includes("_")) continue;
			
			for (const [attrName, attrData] of Object.entries(elementData)) {
				if (attrName.includes("_")) continue;
				
				const compat = (attrData as any).__compat;
				const mdnURL = compat?.mdn_url;
				if (mdnURL) urlsToFetch.add(mdnURL);
			}
		}
		
		result.set(name, markupInfo);
	}
	
	console.log(`🚀 Fetching descriptions for ${urlsToFetch.size} unique URLs in parallel...`);
	
	// Fetch all descriptions in parallel
	const urlArray = Array.from(urlsToFetch);
	const startTime = Date.now();
	
	await Promise.all(
		urlArray.map(url => fetchMDNDescription(url))
	);
	
	const endTime = Date.now();
	console.log(`✅ Completed fetching ${urlArray.length} descriptions in ${endTime - startTime}ms`);
	
	// Second pass: build the actual structure with fetched descriptions
	for (const name of ["html", "svg", "mathml"] as const) {
		const markupInfo = result.get(name)!;
		
		for (const [attrName, attrData] of Object.entries(BCD[name].global_attributes)) {
			if (attrName.includes("_")) continue;

			const compat = (attrData as any).__compat;
			const status = compat?.status;
			const mdnURL = compat?.mdn_url;
			
			// Get cached description and example
			const description = mdnURL ? mdnDescriptionCache.get(mdnURL) : undefined;
			const example = mdnURL ? mdnExampleCache.get(mdnURL) : undefined;
			
			markupInfo.attributes.set(attrName, {
				description,
				deprecated: status?.deprecated || false,
				experimental: status?.experimental || false,
				mdnURL,
				example
			});
		}

		for (const [tagName, elementData] of Object.entries(BCD[name].elements)) {
			if (tagName.includes("_")) continue;

			const attributes = new Map<string, AttributeInfo>();
			for (const [attrName, attrData] of Object.entries(elementData)) {
				if (attrName.includes("_")) continue;

				const compat = (attrData as any).__compat;
				const status = compat?.status;
				const mdnURL = compat?.mdn_url;
				
				// Get cached description and example
				const description = mdnURL ? mdnDescriptionCache.get(mdnURL) : undefined;
				const example = mdnURL ? mdnExampleCache.get(mdnURL) : undefined;
				
				const attrInfo = {
					description,
					deprecated: status?.deprecated || false,
					experimental: status?.experimental || false,
					mdnURL,
					example
				};

				if (name === "mathml") {
					// All MathML elements use the same constructor, so there is no
					// canonical name we can use to define attribute interfaces. Even
					// though specific elements have specific attributes, I don't think
					// it's wise to come up with canonical names (will the constructor be
					// MathMLMSubSupElement or MathMLMSubsupElement) so we just add the
					// attributes to the global MathML interface.
					markupInfo.attributes.set(attrName, attrInfo);
					continue;
				}

				attributes.set(attrName, attrInfo);
			}

			markupInfo.elements.set(tagName, attributes);
		}

		if (name === "svg") {
			// BCD omits a couple of attributes from svg.global_attributes that the
			// SVG spec actually applies to all SVG elements — it only records them
			// per-element. Promote those onto the shared SVG base, cross-referenced
			// against BCD's per-element data so nothing is invented: `fill` (a paint
			// presentation attribute, alongside the global fill-opacity/fill-rule)
			// and `systemLanguage` (a conditional-processing attribute, alongside the
			// global requiredExtensions).
			//
			// Reported upstream: https://github.com/mdn/browser-compat-data/issues/29912
			// Remove this block once those land in svg.global_attributes.
			const svgGlobalGaps = ["fill", "systemLanguage"];
			const knownPerElement = new Map<string, AttributeInfo>();
			for (const attrs of markupInfo.elements.values()) {
				for (const [attrName, info] of attrs) {
					if (!knownPerElement.has(attrName)) {
						knownPerElement.set(attrName, info);
					}
				}
			}
			for (const attrName of svgGlobalGaps) {
				if (markupInfo.attributes.has(attrName)) continue;
				const info = knownPerElement.get(attrName);
				if (info) markupInfo.attributes.set(attrName, info);
			}
		}
	}

	return result;
}

function analyzeTypeScriptDOM(): Map<string, Map<string, string>> {
	const tagNameMapNames = {
		html: "HTMLElementTagNameMap",
		svg: "SVGElementTagNameMap",
		mathml: "MathMLElementTagNameMap",
	};

	const project = new Project({
		useInMemoryFileSystem: true,
		compilerOptions: {
			target: 99, // Latest
			lib: ["dom", "es2023"],
			strict: true,
		},
	});

	const markupToTagNameMap = new Map<string, Map<string, string>>();

	// Parse lib.dom.d.ts from its on-disk text into the in-memory project (the
	// project uses an in-memory fs, so addSourceFileAtPath on a disk path fails).
	const sourceFile = project.createSourceFile(
		"lib.dom.d.ts",
		FS.readFileSync(DOM_LIB_PATH, "utf8"),
		{overwrite: true},
	);
	for (const markup of ["html", "svg", "mathml"] as const) {
		const tagNameMapName = tagNameMapNames[markup];
		const tagNameMap = sourceFile.getInterface(tagNameMapNames[markup]);
		if (!tagNameMap) {
			throw new Error(`${tagNameMapName} missing`);
		}
		const tagNameToElementNameMap = new Map<string, string>();
		for (const prop of tagNameMap.getProperties()) {
			const tagName = prop.getName().replace(/['"]/g, "");
			const elementTypeName = prop.getTypeNode()?.getText();
			if (!elementTypeName) {
				throw new Error(`ElementTypeName missing for ${tagName}`);
			}

			tagNameToElementNameMap.set(tagName, elementTypeName);
		}

		markupToTagNameMap.set(markup, tagNameToElementNameMap);
	}

	return markupToTagNameMap;
}

function extractDOMEventMaps(): {
	allEvents: Map<string, string>;
	elementEventMaps: Map<string, string[]>;
	domEventMapNames: string[];
} {
	const project = new Project({
		useInMemoryFileSystem: true,
		compilerOptions: {
			target: 99, // Latest
			lib: ["dom", "es2023"],
			strict: true,
		},
	});

	const sourceFile = project.createSourceFile(
		"lib.dom.d.ts",
		FS.readFileSync(DOM_LIB_PATH, "utf8"),
		{overwrite: true},
	);

	const allEvents = new Map<string, string>();
	const elementEventMaps = new Map<string, string[]>();

	// Find all DOM-relevant EventMap interfaces
	const allInterfaces = sourceFile.getInterfaces();
	const domEventMapNames = allInterfaces
		.filter((intf) => {
			const name = intf.getName();
			return (
				name.endsWith("ElementEventMap") ||
				name === "DocumentEventMap" ||
				name === "WindowEventMap" ||
				name === "WindowEventHandlersEventMap" ||
				name === "GlobalEventHandlersEventMap" ||
				name === "ShadowRootEventMap"
			);
		})
		.map((intf) => intf.getName());

	console.log(
		`Found ${domEventMapNames.length} DOM EventMap interfaces: ${domEventMapNames.join(", ")}`,
	);

	// Extract events from each interface and track which events belong to which elements
	for (const eventMapName of domEventMapNames) {
		const eventMapInterface = sourceFile.getInterface(eventMapName);
		if (!eventMapInterface) continue;

		// Get all properties (ts-morph flattens inheritance automatically)
		const properties = eventMapInterface.getProperties();
		const eventNames: string[] = [];

		for (const prop of properties) {
			const eventName = prop.getName().replace(/['"]/g, "");
			const eventType = prop.getTypeNode()?.getText() || "Event";

			// Add to global event map
			if (
				!allEvents.has(eventName) ||
				(allEvents.get(eventName) === "Event" && eventType !== "Event")
			) {
				allEvents.set(eventName, eventType);
			}

			eventNames.push(eventName);
		}

		// Map element types to their events
		if (eventMapName.endsWith("ElementEventMap")) {
			// Convert HTMLButtonElementEventMap -> button, SVGSVGElementEventMap -> svg, etc.
			const elementTypeName = eventMapName.replace(/ElementEventMap$/, "");
			const tagName = elementTypeName
				.replace(/^HTML/, "")
				.replace(/^SVG/, "")
				.replace(/^MathML/, "")
				.replace(/Element$/, "")
				.toLowerCase();

			if (tagName) {
				elementEventMaps.set(tagName, eventNames);
			}
		} else if (eventMapName === "GlobalEventHandlersEventMap") {
			// Store global events for HTML elements that don't have specific EventMaps
			elementEventMaps.set("global", eventNames);
		}
	}

	return {allEvents, elementEventMaps, domEventMapNames};
}

function generateHeader(): string {
	return `
		// AUTO-GENERATED — DO NOT EDIT.
		// Generated by scripts/generate.ts; regenerate with \`bun run build\`.

		import type {
			JSXAttributeValue
		} from './utilities';

		/**
		 * Web Standards JSX Types
		 *
		 * Comprehensive, specification-driven TypeScript types for JSX DOM elements.
		 * Exports utilities that frameworks can use to build their own JSX types
		 * with framework-specific customizations.
		 *
		 * Auto-generated by combining:
		 * - MDN Browser Compatibility Data (BCD)
		 * - TypeScript DOM type definitions
		 * - WAI-ARIA specification
		 *
		 * @see https://github.com/mdn/browser-compat-data
		 * @see https://github.com/microsoft/TypeScript
		 * @see https://github.com/jamiebuilds/aria-data
		 */
	`;
}

async function generateMicrodataAttributeInterface(): Promise<string> {
	const microdataData = await Bun.file(Path.join(DATA_DIR, "microdata-attributes.json")).json();
	// Generate Microdata interface
	const microdataAttrs = Object.entries(microdataData.attributes || {})
		.map(
			([name, info]: [string, any]) =>
				`/** ${info.purpose.replace(/\*\//g, "*\\/").replace(/\s+/g, ' ').trim()} */\n${name}?: JSXAttributeValue;`,
		)
		.sort();
	return `
		/**
		 * HTML5 Microdata attributes for structured data
		 * @see https://html.spec.whatwg.org/multipage/microdata.html
		 */
		export interface MicrodataAttributes {
			${microdataAttrs.join("\n")}
		}
	`;
}

async function generateRDFaDataAttributeInterface(): Promise<string> {
	const rdfaData = await Bun.file(Path.join(DATA_DIR, "rdfa-attributes.json")).json();
	const rdfaAttrs = Object.entries(rdfaData.attributes || {})
		.map(
			([name, info]: [string, any]) => {
				// Clean up whitespace and truncate if needed
				const cleanPurpose = info.purpose.replace(/\s+/g, ' ').trim();
				const purpose = cleanPurpose.length > 200
					? cleanPurpose.substring(0, 200).replace(/\s+\S*$/, '') + '...'
					: cleanPurpose;
				return `/** ${purpose.replace(/\*\//g, "*\\/")} */\n${name}?: JSXAttributeValue;`;
			}
		)
		.sort();
	return `
		/**
		 * RDFa attributes for semantic markup
		 * @see https://www.w3.org/TR/html-rdfa/
		 */
		export interface RDFaAttributes {
			${rdfaAttrs.join("\n")}
		}
	`;
}


async function generateAttributeInterfaces(
	markups: Map<string, MarkupInfo>,
	markupToTagNameMap: Map<string, Map<string, string>>,
): Promise<string> {
	let result = "";
	const mappings: Record<string, Array<string>> = {
		html: [],
		svg: [],
		mathml: [],
	};
	for (const [markupName, markupInfo] of markups) {
		// TODO: add appropriate extends for each
		const markupInterfaceName = `${markupInfo.name}Attributes`
		const attributeEntries = await Promise.all(
			Array.from(markupInfo.attributes.entries()).map(async ([attrName, attrInfo]) => {
					const jsdocLines = [];
					if (attrInfo.description) {
						jsdocLines.push(attrInfo.description);
					}
					if (attrInfo.example) {
						// Format HTML example with prettier
						const formattedHTML = await prettier.format(attrInfo.example, {
							parser: 'html',
							printWidth: 60,
							tabWidth: 2,
							htmlWhitespaceSensitivity: 'ignore'
						});
						// Clean up and prepare for JSDoc with proper asterisks
						const cleanedExample = formattedHTML
							.trim()
							.split('\n')
							.map(line => ` * ${line}`)
							.join('\n');
						jsdocLines.push(`@example\n${cleanedExample}`);
					}
					if (attrInfo.deprecated) jsdocLines.push('@deprecated');
					if (attrInfo.experimental) jsdocLines.push('@experimental');
					
					const jsdoc = jsdocLines.length > 0 
						? `/**\n * ${jsdocLines.join('\n * ')}\n */\n`
						: '';
					
					return `${jsdoc}${attrName.includes("-") ? `"${attrName}"` : attrName}: JSXAttributeValue;`;
			})
		);
		
		result += `
			export interface ${markupInterfaceName} extends GlobalAttributes {
				${attributeEntries.join("\n\t\t\t\t")}
			}
		`;
		result += "\n\n";
		for (const [tagName, attributes] of markupInfo.elements) {
			const constructorName = markupToTagNameMap.get(markupName)?.get(tagName);
			// Only process elements that exist in TypeScript's DOM type definitions
			if (!constructorName) {
				continue;
			}

			if (attributes.size && markupName !== "mathml") {
				const elementInterfaceName = `${constructorName.replace(/Element$/, "")}Attributes`;
				const elementAttributeEntries = await Promise.all(
					Array.from(attributes.entries()).map(async ([attrName, attrInfo]) => {
							const jsdocLines = [];
							if (attrInfo.description) jsdocLines.push(attrInfo.description);
							if (attrInfo.example) {
								// Format HTML example with prettier
								const formattedHTML = await prettier.format(attrInfo.example, {
									parser: 'html',
									printWidth: 60,
									tabWidth: 2,
									htmlWhitespaceSensitivity: 'ignore'
								});
								// Clean up and prepare for JSDoc with proper asterisks
								const cleanedExample = formattedHTML
									.trim()
									.split('\n')
									.map(line => ` * ${line}`)
									.join('\n');
								jsdocLines.push(`@example\n${cleanedExample}`);
							}
							if (attrInfo.deprecated) jsdocLines.push('@deprecated');
							if (attrInfo.experimental) jsdocLines.push('@experimental');
							
							const jsdoc = jsdocLines.length > 0 
								? `/**\n * ${jsdocLines.join('\n * ')}\n */\n`
								: '';
							
							return `${jsdoc}${attrName.includes("-") ? `"${attrName}"` : attrName}: JSXAttributeValue;`;
					})
				);
				
				result += `
					/* ${tagName} attributes */
					export interface ${elementInterfaceName} extends ${markupInterfaceName} {
						${elementAttributeEntries.join("\n\t\t\t\t\t")}
					}
				`;
				mappings[markupName].push(`${tagName.includes("-") ? `"${tagName}"` : tagName}: ${elementInterfaceName};`);
			} else {
				mappings[markupName].push(`${tagName.includes("-") ? `"${tagName}"` : tagName}: ${markupInterfaceName};`);
			}
		}
		result += `
			/** Map of ${markupNames[markupName]} tag names to their attribute interfaces */
			export interface ${markupNames[markupName]}AttributesTagNamesMap {
				${mappings[markupName].join("\n")}
			}
		`;
	}

	return result;
}

function generateARIATypes(): string {
	const ariaAttributes: string[] = [];
	const ariaAttributeCount = Object.keys(AriaData.attributes).length;

	console.log(
		`Found ${ariaAttributeCount} ARIA attributes in WAI-ARIA specification`,
	);

	// Generate strongly typed ARIA attributes from the official specification
	for (const [ref, attribute] of Object.entries(AriaData.attributes)) {
		const attrName = attribute.name;
		const description = attribute.description;

		// Generate type based on valueType and allowed values
		let type = "string";

		if (attribute.values && attribute.values.length > 0) {
			// Create union type from allowed values
			const allowedValues = attribute.values
				.map((v) => `"${v.value}"`)
				.join(" | ");
			type = allowedValues;
		} else {
			// Infer type from valueType URL
			const valueTypeRef = attribute.valueType;
			if (valueTypeRef.includes("valuetype_true-false")) {
				type = 'boolean | "true" | "false"';
			} else if (valueTypeRef.includes("valuetype_true-false-undefined")) {
				type = 'boolean | "true" | "false" | "undefined"';
			} else if (valueTypeRef.includes("valuetype_integer")) {
				type = "number | string";
			} else if (valueTypeRef.includes("valuetype_number")) {
				type = "number | string";
			} else if (valueTypeRef.includes("valuetype_idref")) {
				type = "string";
			} else if (valueTypeRef.includes("valuetype_idref_list")) {
				type = "string";
			} else if (valueTypeRef.includes("valuetype_token_list")) {
				type = "string";
			} else {
				type = "string";
			}
		}

		// Add JSDoc comment with description
		const jsDocComment = description
			? `\n  /** ${description} */`
			: `\n  /** ARIA attribute: ${attrName} */`;

		ariaAttributes.push(`${jsDocComment}\n	"${attrName}"?: ${type};`);
	}

	const sortedAttributes = ariaAttributes.sort();

	return `
		/**
		 * Comprehensive ARIA Attribute Types
		 *
		 * Auto-generated from the official WAI-ARIA 1.1 specification using aria-data.
		 * Provides strongly typed ARIA attributes with proper value constraints and documentation.
		 *
		 * @see https://www.w3.org/TR/wai-aria-1.1/
		 * @see https://github.com/jamiebuilds/aria-data
		 */
		export interface ARIAAttributes {
			${sortedAttributes.join("\n")}
		}
	`;
}


function generateDOMEventMapInterface(domEventMapNames: string[]): string {
	// Sort the interface names for consistent output
	const sortedInterfaceNames = domEventMapNames.sort();

	const extendsClause = sortedInterfaceNames.length > 0
		? ` extends ${sortedInterfaceNames.join(', ')}`
		: '';

	return `
		/**
		 * Comprehensive DOM Event Map Interface
		 *
		 * This interface extends all DOM-relevant EventMap interfaces from TypeScript's lib.dom.d.ts:
		 * ${sortedInterfaceNames.map(name => ` * - ${name}`).join('\n')}
		 *
		 * Provides typed events with proper Event subtypes (MouseEvent, KeyboardEvent, etc.)
		 * by leveraging TypeScript's interface inheritance rather than merging properties.
		 *
		 * Usage in any JSX framework:
		 *
		 * \`\`\`typescript
		 * import { DOMEventMap } from './jsx-dom-types.js';
		 *
		 * // For frameworks with addEventListener support:
		 * declare global {
		 *	 module YourFramework {
		 *		 interface EventMap extends DOMEventMap {}
		 *	 }
		 * }
		 * \`\`\`
		 */
		export interface DOMEventMap${extendsClause} {}
	`;
}

if (import.meta.main) {
	// Step 0: load the MDN cache, then fetch global attribute descriptions
	// through it (a cache miss fetches from MDN).
	console.log("🌐 Loading global attribute descriptions...");
	loadMDNCache();
	GLOBAL_ATTRIBUTES = await loadGlobalAttributeDescriptions();
	console.log(`Loaded ${GLOBAL_ATTRIBUTES.size} global attribute descriptions`);

	const markups = await analyzeMDNData();
	saveMDNCache();
	const markupToTagNameMap = analyzeTypeScriptDOM();
	const {domEventMapNames} = extractDOMEventMaps();
	const header = generateHeader();
	const attributeInterfaces = await generateAttributeInterfaces(markups, markupToTagNameMap);
	const ariaDefinition = generateARIATypes();
	const microdataAttributeInterface = await generateMicrodataAttributeInterface();
	const rfdaDataAttributeInterface = await generateRDFaDataAttributeInterface();
	const eventMapDefinition = generateDOMEventMapInterface(domEventMapNames);

	// Generate event-map file first
	const eventMapPath = Path.resolve(
		Path.dirname(import.meta.url.replace("file://", "")),
		"../src/event-map.generated.d.ts",
	);
	
	const eventMapFileContent = `/**
 * DOM Event Map Interface
 * 
 * Auto-generated from TypeScript's lib.dom.d.ts
 * DO NOT EDIT - This file is generated by scripts/generate.ts
 */

${eventMapDefinition.trim()}
`;
	
	FS.writeFileSync(eventMapPath, eventMapFileContent, "utf8");
	console.log(`\n📄 Generated: ${Path.relative(process.cwd(), eventMapPath)}`);

	const combinedDefinition = `
		${header}

		import type { DOMEventMap } from './event-map.generated';
		export type { DOMEventMap };

		${ariaDefinition}
		${microdataAttributeInterface}
		${rfdaDataAttributeInterface}
		/**
		 * XML attributes for XML-compatible markup
		 * @see https://www.w3.org/TR/xml/#sec-starttags
		 */
		export interface XMLAttributes {
			/** Standard XML namespace declaration */
			xmlns?: JSXAttributeValue;
			/** XML namespace declaration for specific prefixes */
			[key: \`xmlns:\${string}\`]: JSXAttributeValue;
			/** XML language identifier */
			"xml:lang"?: JSXAttributeValue;
			/** XML space handling */
			"xml:space"?: "default" | "preserve";
			/** XML base URI */
			"xml:base"?: JSXAttributeValue;
			/** XML identifier */
			"xml:id"?: JSXAttributeValue;
		}
		/**
		 * Global attributes available on every HTML, SVG, and MathML element.
		 * Combines the universal global attributes (class, id, lang, style,
		 * tabindex) with XML, ARIA, Microdata, and RDFa attributes.
		 */
		export interface GlobalAttributes extends XMLAttributes, ARIAAttributes, MicrodataAttributes, RDFaAttributes {
			${generateUniversalGlobalAttributeEntries()}
			/** Custom data attributes */
			[key: \`data-\${string}\`]: JSXAttributeValue;
		}
		${attributeInterfaces}
	`;

	// Write to file
	const outputPath = Path.resolve(
		Path.dirname(import.meta.url.replace("file://", "")),
		"../src/attributes.generated.d.ts",
	);
	FS.writeFileSync(outputPath, combinedDefinition, "utf8");

	console.log(`📄 Generated: ${Path.relative(process.cwd(), outputPath)}`);
}
