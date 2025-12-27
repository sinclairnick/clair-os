#!/usr/bin/env npx tsx

/**
 * Legacy Recipe Import Script
 * 
 * This script imports recipes from the legacy Grossr app export format.
 * Each author folder contains recipe folders, which contain a .txt file and optionally images.
 * 
 * Usage:
 *   npx tsx scripts/import-legacy-recipes.ts <author-folder> [--api-url <url>] [--family-id <id>]
 * 
 * Example:
 *   npx tsx scripts/import-legacy-recipes.ts /path/to/export/TheaThyme --family-id abc-123
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// Configuration
const DEFAULT_API_URL = "http://localhost:3001/api";
const SUPPORTED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

interface ParsedRecipe {
	title: string;
	description: string;
	servings: number;
	yield?: string;
	prepTimeMinutes?: number;
	cookTimeMinutes?: number;
	instructions: string;
	tags: string[];
	imageFilename?: string;
	ingredients: {
		name: string;
		quantity: number;
		unit: string;
	}[];
}

interface ImportResult {
	success: boolean;
	recipeName: string;
	error?: string;
}

// Parse command line arguments
function parseArgs(): { authorFolder: string; apiUrl: string; familyId: string } {
	const args = process.argv.slice(2);

	if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
		console.log(`
Legacy Recipe Import Script

Usage:
  npx tsx scripts/import-legacy-recipes.ts <author-folder> [options]

Options:
  --api-url <url>     API base URL (default: http://localhost:3001/api)
  --family-id <id>    Family ID to import recipes into (required)
  --help, -h          Show this help message

Example:
  npx tsx scripts/import-legacy-recipes.ts /path/to/export/TheaThyme --family-id abc-123
`);
		process.exit(0);
	}

	const authorFolder = args[0];
	let apiUrl = DEFAULT_API_URL;
	let familyId = "";

	for (let i = 1; i < args.length; i++) {
		if (args[i] === "--api-url" && args[i + 1]) {
			apiUrl = args[++i];
		} else if (args[i] === "--family-id" && args[i + 1]) {
			familyId = args[++i];
		}
	}

	if (!familyId) {
		console.error("Error: --family-id is required");
		process.exit(1);
	}

	if (!fs.existsSync(authorFolder)) {
		console.error(`Error: Author folder not found: ${authorFolder}`);
		process.exit(1);
	}

	return { authorFolder, apiUrl, familyId };
}

/**
 * Clean up strings from legacy exports, handling common Unicode issues
 */
function cleanString(str: string): string {
	if (!str) return "";
	return str
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, " ")
		.trim();
}

// Parse the Grossr export format
function parseGrossrFormat(text: string): ParsedRecipe {
	const recipe: ParsedRecipe = {
		title: "",
		description: "",
		servings: 4,
		instructions: "",
		tags: [],
		ingredients: [],
	};

	const lines = text.split("\n");
	let currentSection = "header";
	const instructionLines: string[] = [];
	const ingredientLines: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		// Detect section markers
		if (line === "===DETAILS===") {
			currentSection = "details";
			continue;
		}
		if (line === "===STEPS===") {
			currentSection = "steps";
			continue;
		}
		if (line === "===INGREDIENTS===") {
			currentSection = "ingredients";
			continue;
		}

		// Parse based on section
		const cleanedLine = cleanString(line);
		if (currentSection === "header") {
			if (i === 0 && cleanedLine) {
				recipe.title = cleanedLine;
			} else if (cleanedLine && !recipe.description) {
				recipe.description = cleanedLine;
			}
		} else if (currentSection === "details") {
			if (cleanedLine.startsWith("Category:")) {
				recipe.tags.push(cleanedLine.replace("Category:", "").trim());
			} else if (cleanedLine.startsWith("Yield:")) {
				const yieldText = cleanedLine.replace("Yield:", "").trim();
				const servingsMatch = yieldText.match(/(\d+)/);
				if (servingsMatch) recipe.servings = parseInt(servingsMatch[1], 10);

				// Only set yield if it's not just describing servings
				if (!yieldText.toLowerCase().includes("serving")) {
					recipe.yield = yieldText;
				}
			} else if (cleanedLine.startsWith("Cooking time:")) {
				const match = cleanedLine.match(/(\d+)/);
				if (match) recipe.cookTimeMinutes = parseInt(match[1], 10);
			} else if (cleanedLine.startsWith("Prep time:")) {
				const match = cleanedLine.match(/(\d+)/);
				if (match) recipe.prepTimeMinutes = parseInt(match[1], 10);
			} else if (cleanedLine.startsWith("Image:")) {
				recipe.imageFilename = cleanedLine.replace("Image:", "").trim();
			}
		} else if (currentSection === "steps") {
			// Steps are formatted as "1. Title" or just "1."
			const stepMatch = cleanedLine.match(/^(\d+)\.\s*(.*)$/);
			if (stepMatch) {
				const num = stepMatch[1];
				const title = stepMatch[2].trim();
				if (title) {
					instructionLines.push(`STEP_HEADER:${num}:${title}`);
				} else {
					instructionLines.push(`STEP_HEADER:${num}`);
				}
			} else if (cleanedLine) {
				instructionLines.push(cleanedLine);
			}
		} else if (currentSection === "ingredients") {
			if (cleanedLine && /[\d.]/.test(cleanedLine.charAt(0))) {
				ingredientLines.push(cleanedLine);
			}
		}
	}

	// Parse ingredients (format: "0.5 Cup - Ingredient name, Notes")
	const seenIngredients = new Set<string>();
	recipe.ingredients = ingredientLines
		.filter((line) => {
			// Remove duplicates (the export seems to double ingredients)
			if (seenIngredients.has(line)) return false;
			seenIngredients.add(line);
			return true;
		})
		.map((line) => {
			const match = line.match(/^([\d.]+)\s+(\w+)\s+-\s+(.+)$/);
			if (match) {
				const [, qty, unit, nameWithNotes] = match;
				const [name] = nameWithNotes.split(",").map((s) => s.trim());
				return {
					quantity: parseFloat(qty) || 1,
					unit: unit || "",
					name: name || line,
				};
			}
			return { quantity: 1, unit: "", name: line };
		});

	// Format instructions as JSON for the BlockNote editor (array of blocks)
	const instructionBlocks = instructionLines.map((line) => {
		if (line.startsWith("STEP_HEADER:")) {
			const parts = line.split(":");
			const stepNum = parts[1];
			// Join remaining parts in case the title had colons
			const title = parts.slice(2).join(":");
			const text = title ? `Step ${stepNum}: ${title}` : `Step ${stepNum}`;
			return {
				type: "heading",
				props: { level: 3 },
				content: [{ type: "text", text, styles: {} }],
			};
		}
		return {
			type: "paragraph",
			content: [{ type: "text", text: line, styles: {} }],
		};
	});
	recipe.instructions = JSON.stringify(instructionBlocks);

	return recipe;
}

// Upload an image file
async function uploadImage(
	filePath: string,
	apiUrl: string,
	cookie: string
): Promise<string | null> {
	try {
		const fileBuffer = fs.readFileSync(filePath);
		const fileName = path.basename(filePath);
		const mimeType = getMimeType(filePath);

		const formData = new FormData();
		formData.append("file", new Blob([fileBuffer], { type: mimeType }), fileName);

		const response = await fetch(`${apiUrl}/storage/upload`, {
			method: "POST",
			headers: {
				Cookie: cookie,
			},
			body: formData,
		});

		if (!response.ok) {
			console.error(`Failed to upload image ${fileName}: ${response.statusText}`);
			return null;
		}

		const data = (await response.json()) as { url: string };
		return data.url;
	} catch (error) {
		console.error(`Error uploading image ${filePath}:`, error);
		return null;
	}
}

function getMimeType(filePath: string): string {
	const ext = path.extname(filePath).toLowerCase();
	const mimeTypes: Record<string, string> = {
		".jpg": "image/jpeg",
		".jpeg": "image/jpeg",
		".png": "image/png",
		".gif": "image/gif",
		".webp": "image/webp",
	};
	return mimeTypes[ext] || "application/octet-stream";
}

// Create a recipe via the API
async function createRecipe(
	recipe: ParsedRecipe,
	imageUrl: string | undefined,
	familyId: string,
	apiUrl: string,
	cookie: string
): Promise<boolean> {
	try {
		const payload = {
			familyId,
			title: recipe.title,
			description: recipe.description || undefined,
			servings: recipe.servings,
			yield: recipe.yield,
			prepTimeMinutes: recipe.prepTimeMinutes,
			cookTimeMinutes: recipe.cookTimeMinutes,
			instructions: recipe.instructions,
			tags: recipe.tags,
			imageUrl,
			ingredients: recipe.ingredients.map((ing) => ({
				name: ing.name,
				quantity: ing.quantity,
				unit: ing.unit,
			})),
		};

		const response = await fetch(`${apiUrl}/recipes`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Cookie: cookie,
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorBody = await response.text();
			console.error(`Failed to create recipe "${recipe.title}": ${response.statusText}`);
			console.error(`Response: ${errorBody}`);
			return false;
		}

		return true;
	} catch (error) {
		console.error(`Error creating recipe "${recipe.title}":`, error);
		return false;
	}
}

// Process a single recipe folder
async function processRecipeFolder(
	recipeFolder: string,
	familyId: string,
	apiUrl: string,
	cookie: string
): Promise<ImportResult> {
	const folderName = path.basename(recipeFolder);

	try {
		// Find the .txt file
		const files = fs.readdirSync(recipeFolder);
		const txtFile = files.find((f) => f.endsWith(".txt"));

		if (!txtFile) {
			return { success: false, recipeName: folderName, error: "No .txt file found" };
		}

		// Read and parse the recipe
		const txtPath = path.join(recipeFolder, txtFile);
		const buffer = fs.readFileSync(txtPath);

		// Detct encoding (heuristic: try UTF-8, fallback to Latin-1 if replacement characters appear)
		let content = buffer.toString("utf8");
		if (content.includes("\uFFFD")) {
			content = buffer.toString("latin1");
		}

		const recipe = parseGrossrFormat(content);

		if (!recipe.title) {
			return { success: false, recipeName: folderName, error: "Could not parse recipe title" };
		}

		// Upload image if present
		let imageUrl: string | undefined;
		if (recipe.imageFilename) {
			const imagePath = path.join(recipeFolder, recipe.imageFilename);
			if (fs.existsSync(imagePath)) {
				const uploadedUrl = await uploadImage(imagePath, apiUrl, cookie);
				if (uploadedUrl) {
					imageUrl = uploadedUrl;
				}
			}
		}

		// Create the recipe
		const success = await createRecipe(recipe, imageUrl, familyId, apiUrl, cookie);

		return {
			success,
			recipeName: recipe.title,
			error: success ? undefined : "Failed to create recipe via API",
		};
	} catch (error) {
		return {
			success: false,
			recipeName: folderName,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

// Prompt for user input
function prompt(question: string): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

// Main function
async function main() {
	const { authorFolder, apiUrl, familyId } = parseArgs();

	console.log("\n🍳 Legacy Recipe Import Script");
	console.log("================================\n");
	console.log(`📁 Author folder: ${authorFolder}`);
	console.log(`🌐 API URL: ${apiUrl}`);
	console.log(`👪 Family ID: ${familyId}`);

	// Get list of recipe folders
	const entries = fs.readdirSync(authorFolder, { withFileTypes: true });
	const recipeFolders = entries
		.filter((e) => e.isDirectory())
		.map((e) => path.join(authorFolder, e.name));

	console.log(`\n📚 Found ${recipeFolders.length} recipe folders\n`);

	if (recipeFolders.length === 0) {
		console.log("No recipe folders found. Exiting.");
		process.exit(0);
	}

	// List first few recipes
	console.log("First 5 recipes:");
	recipeFolders.slice(0, 5).forEach((f) => {
		console.log(`  - ${path.basename(f)}`);
	});
	if (recipeFolders.length > 5) {
		console.log(`  ... and ${recipeFolders.length - 5} more\n`);
	}

	// Get session cookie for authentication
	console.log("\n⚠️  Authentication Required");
	console.log("You need to provide a session cookie for authentication.");
	console.log("To get this:");
	console.log("  1. Log into the app in your browser");
	console.log("  2. Open DevTools > Application > Cookies");
	console.log("  3. Copy the entire cookie string (or just the session cookie)\n");

	const cookie = await prompt("Paste your session cookie: ");

	if (!cookie) {
		console.error("Error: Session cookie is required for authentication");
		process.exit(1);
	}

	// Confirm before proceeding
	const confirm = await prompt(`\nImport ${recipeFolders.length} recipes? (y/N): `);
	if (confirm.toLowerCase() !== "y") {
		console.log("Import cancelled.");
		process.exit(0);
	}

	console.log("\n🚀 Starting import...\n");

	// Process each recipe folder
	const results: ImportResult[] = [];
	let successCount = 0;
	let failCount = 0;

	for (let i = 0; i < recipeFolders.length; i++) {
		const folder = recipeFolders[i];
		const progress = `[${i + 1}/${recipeFolders.length}]`;

		process.stdout.write(`${progress} Processing ${path.basename(folder)}... `);

		const result = await processRecipeFolder(folder, familyId, apiUrl, cookie);
		results.push(result);

		if (result.success) {
			successCount++;
			console.log("✅");
		} else {
			failCount++;
			console.log(`❌ ${result.error}`);
		}

		// Small delay to avoid overwhelming the API
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	// Print summary
	console.log("\n================================");
	console.log("📊 Import Summary");
	console.log("================================");
	console.log(`✅ Successful: ${successCount}`);
	console.log(`❌ Failed: ${failCount}`);
	console.log(`📚 Total: ${recipeFolders.length}`);

	if (failCount > 0) {
		console.log("\n❌ Failed recipes:");
		results
			.filter((r) => !r.success)
			.forEach((r) => {
				console.log(`  - ${r.recipeName}: ${r.error}`);
			});
	}

	console.log("\n✨ Import complete!\n");
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
