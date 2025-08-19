#!/usr/bin/env bun
/**
 * Parse W3C RDFa Core specification definition list
 */

import * as cheerio from "cheerio";

async function parseRDFaW3C() {
	console.log("🔍 Fetching W3C RDFa Core specification...");

	const response = await fetch("https://www.w3.org/TR/rdfa-core/");
	const html = await response.text();
	const $ = cheerio.load(html);

	const attributes: Record<string, any> = {};

	// Find the RDFa Attributes section (5.4)
	let inAttributesSection = false;
	
	$("h3, h4").each((_, heading) => {
		const $heading = $(heading);
		const headingText = $heading.text();
		
		// Check if we're in the RDFa Attributes section
		if (headingText.includes("RDFa Attributes") || headingText.includes("5.4")) {
			inAttributesSection = true;
			
			// Look for the definition list after this heading
			let $next = $heading.next();
			while ($next.length && !$next.is("h1, h2, h3")) {
				if ($next.is("dl")) {
					// Parse the definition list
					$next.find("dt").each((_, dt) => {
						const $dt = $(dt);
						const attrName = $dt.text().trim();
						const $dd = $dt.next("dd");
						
						if ($dd.length && attrName) {
							// Clean up the attribute name (remove @ if present)
							const cleanName = attrName.replace(/^@/, '');
							attributes[cleanName] = {
								purpose: $dd.text().trim(),
								globalAttribute: true,
							};
						}
					});
					break;
				}
				$next = $next.next();
			}
		}
	});

	// If we didn't find attributes in the section approach, try finding all dt/dd pairs with RDFa attributes
	if (Object.keys(attributes).length === 0) {
		const rdfaAttrs = ['about', 'content', 'datatype', 'href', 'inlist', 'prefix', 'property', 'rel', 'resource', 'rev', 'src', 'typeof', 'vocab'];
		
		$("dt").each((_, dt) => {
			const $dt = $(dt);
			const text = $dt.text().trim();
			
			rdfaAttrs.forEach(attr => {
				if (text === attr || text === `@${attr}`) {
					const $dd = $dt.next("dd");
					if ($dd.length) {
						attributes[attr] = {
							purpose: $dd.text().trim(),
							globalAttribute: !['href', 'src'].includes(attr),
						};
					}
				}
			});
		});
	}

	const jsonData = {
		source: "W3C RDFa Core 1.1 Specification",
		url: "https://www.w3.org/TR/rdfa-core/",
		attributes,
	};

	await Bun.write(
		"./data/rdfa-attributes.json",
		JSON.stringify(jsonData, null, 2),
	);
	
	console.log(`\n📋 Found ${Object.keys(attributes).length} attributes`);
	Object.entries(attributes).forEach(([name, data]) => {
		console.log(`   ${name}: ${data.purpose.substring(0, 60)}...`);
	});
	console.log("\n💾 Saved to rdfa-attributes.json");
}

parseRDFaW3C().catch(console.error);