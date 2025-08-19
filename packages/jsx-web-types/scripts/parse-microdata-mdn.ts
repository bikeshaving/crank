#!/usr/bin/env bun
/**
 * Parse MDN Microdata documentation - scrape actual descriptions from MDN
 */

import * as cheerio from "cheerio";

async function parseMicrodataMDN() {
	console.log("🔍 Fetching MDN Microdata documentation...");

	const response = await fetch(
		"https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Microdata",
	);
	const html = await response.text();
	const $ = cheerio.load(html);

	const attributes: Record<string, any> = {};
	const microdataAttrs = ['itemid', 'itemprop', 'itemref', 'itemscope', 'itemtype'];

	// Look for the "Global attributes" section specifically
	console.log("Searching for Global attributes section...");
	
	const globalSection = $('#global_attributes').parent();
	if (!globalSection.length) {
		console.error("Could not find Global attributes section");
		process.exit(1);
	}
	
	// Find the section content div
	const sectionContent = globalSection.find('.section-content');
	if (!sectionContent.length) {
		console.error("Could not find section-content within Global attributes");
		process.exit(1);
	}
	
	console.log("Found Global attributes section, parsing paragraphs...");
	
	// Parse each paragraph that contains a microdata attribute
	sectionContent.find('p').each((_, paragraph) => {
		const $p = $(paragraph);
		const $code = $p.find('code').first();
		
		if ($code.length) {
			const attrName = $code.text().trim();
			
			if (microdataAttrs.includes(attrName)) {
				// Extract the text after the first "– " (en dash)
				const fullText = $p.text();
				const dashIndex = fullText.indexOf(' – ');
				
				if (dashIndex > 0) {
					const description = fullText.substring(dashIndex + 3).trim();
					
					if (description.length > 10) {
						attributes[attrName] = {
							purpose: description,
							globalAttribute: true,
						};
						console.log(`✅ Found ${attrName}: ${description.slice(0, 80)}...`);
					}
				}
			}
		}
	});

	// Fail hard if we couldn't find descriptions for all attributes
	const missingAttributes = microdataAttrs.filter(attr => !attributes[attr]);
	if (missingAttributes.length > 0) {
		console.error(`❌ Failed to scrape descriptions for: ${missingAttributes.join(', ')}`);
		console.error("Could not extract proper descriptions from MDN. Scraping failed.");
		process.exit(1);
	}

	// Validate that we have meaningful descriptions
	Object.entries(attributes).forEach(([attr, data]) => {
		if (!data.purpose || data.purpose.length < 10) {
			console.error(`❌ Invalid description for ${attr}: "${data.purpose}"`);
			console.error("Scraped description is too short or empty. Scraping failed.");
			process.exit(1);
		}
	});

	const jsonData = {
		source: "MDN Web Docs - Microdata",
		url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Microdata",
		scraped_at: new Date().toISOString(),
		attributes,
	};

	await Bun.write(
		"./data/microdata-attributes.json",
		JSON.stringify(jsonData, null, 2),
	);
	
	console.log(`✅ Successfully scraped ${Object.keys(attributes).length} microdata attributes from MDN`);
	console.log("💾 Saved to microdata-attributes.json");
}

parseMicrodataMDN().catch((error) => {
	console.error("❌ Scraping failed:", error);
	process.exit(1);
});