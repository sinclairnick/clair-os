'use client';

import * as chrono from 'chrono-node';
import { formatDuration } from './blocknote-schema';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface IngredientMention {
	id: string;
	name: string;
	quantity?: number;
	unit?: string;
}

export interface TimerMention {
	id: string;
	duration: string;
	durationMs: number;
}

export interface RecipeReference {
	id: string;
	title: string;
}

// Mention menu item types
export type MentionItemType = 'ingredient' | 'recipe';

export interface MentionItem {
	type: MentionItemType;
	id: string;
	name: string;
	isNew?: boolean;
	quantity?: number;
	unit?: string;
}

export interface TimerItem {
	duration: string;
	durationMs: number;
	label: string;
}

// ─────────────────────────────────────────────────────────────
// Duration Parsing (using chrono-node)
// ─────────────────────────────────────────────────────────────

const NUMBER_WORDS: Record<string, number> = {
	'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
	'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
	'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
	'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18,
	'nineteen': 19, 'twenty': 20, 'thirty': 30, 'forty': 40,
	'fifty': 50, 'sixty': 60
};

function textToNumber(text: string): string {
	const words = text.toLowerCase().split(/\s+/);
	let result = '';

	for (let i = 0; i < words.length; i++) {
		const w = words[i];
		if (NUMBER_WORDS[w] !== undefined) {
			let val = NUMBER_WORDS[w];
			// Check for next word compound (e.g. "twenty" "five")
			if (i + 1 < words.length && (val >= 20) && NUMBER_WORDS[words[i + 1]] !== undefined && NUMBER_WORDS[words[i + 1]] < 10) {
				val += NUMBER_WORDS[words[i + 1]];
				i++; // skip next
			}
			result += (result ? ' ' : '') + val;
		} else {
			result += (result ? ' ' : '') + w;
		}
	}

	return result;
}

export function parseDurationWithChrono(text: string): number {
	const preprocessed = textToNumber(text);
	const parsed = chrono.parse(`in ${preprocessed}`);
	if (parsed.length > 0 && parsed[0].start) {
		const date = parsed[0].start.date();
		const now = new Date();
		return Math.max(0, date.getTime() - now.getTime());
	}

	let ms = 0;
	const hours = text.match(/(\d+)\s*h/i);
	const minutes = text.match(/(\d+)\s*m/i);
	const seconds = text.match(/(\d+)\s*s/i);

	if (hours) ms += parseInt(hours[1]) * 60 * 60 * 1000;
	if (minutes) ms += parseInt(minutes[1]) * 60 * 1000;
	if (seconds) ms += parseInt(seconds[1]) * 1000;

	// If just a number, assume minutes
	if (ms === 0 && /^\d+$/.test(text.trim())) {
		ms = parseInt(text.trim()) * 60 * 1000;
	}

	return ms || 60000; // Default to 1 minute
}

// ─────────────────────────────────────────────────────────────
// Mention Suggestion Items (@)
// ─────────────────────────────────────────────────────────────

export function getMentionItems(
	query: string,
	existingIngredients: IngredientMention[] = [],
	_existingRecipes: RecipeReference[] = [] // Future use
): MentionItem[] {
	const lowerQuery = query.toLowerCase();
	const results: MentionItem[] = [];

	// Filter existing ingredients
	const ingredientMatches = existingIngredients
		.filter((item) => item.name.toLowerCase().includes(lowerQuery))
		.map((item) => ({
			type: 'ingredient' as const,
			id: item.id,
			name: item.name,
			isNew: false,
			quantity: item.quantity,
			unit: item.unit,
		}));

	results.push(...ingredientMatches);

	// TODO: Add recipe matches when implemented
	// const recipeMatches = existingRecipes
	//   .filter((item) => item.title.toLowerCase().includes(lowerQuery))
	//   .map((item) => ({
	//     type: 'recipe' as const,
	//     id: item.id,
	//     name: item.title,
	//   }));
	// results.push(...recipeMatches);

	// Add "Create new ingredient" option if query doesn't match existing
	if (query.trim() && !ingredientMatches.some((m) => m.name.toLowerCase() === lowerQuery)) {
		results.unshift({
			type: 'ingredient',
			id: `new-${Date.now()}`,
			name: query.trim(),
			isNew: true,
		});
	}

	return results.slice(0, 10);
}

// ─────────────────────────────────────────────────────────────
// Timer Suggestion Items (#)
// ─────────────────────────────────────────────────────────────

const DEFAULT_TIMER_SUGGESTIONS = [
	'5 minutes',
	'10 minutes',
	'15 minutes',
	'30 minutes',
	'1 hour',
	'2 hours',
];

export function getTimerItems(query: string): TimerItem[] {
	const suggestions = DEFAULT_TIMER_SUGGESTIONS;

	if (!query) {
		return suggestions.slice(0, 6).map((s) => ({
			duration: s,
			durationMs: parseDurationWithChrono(s),
			label: formatDuration(parseDurationWithChrono(s)),
		}));
	}

	const filtered = suggestions.filter((item) =>
		item.toLowerCase().includes(query.toLowerCase())
	);

	// If query looks like a valid duration, add it as custom option
	if (query.trim()) {
		const ms = parseDurationWithChrono(query);
		if (ms > 0) {
			const formatted = formatDuration(ms);
			// Only add if not already in filtered results
			if (!filtered.some((f) => formatDuration(parseDurationWithChrono(f)) === formatted)) {
				return [
					{ duration: query.trim(), durationMs: ms, label: formatted },
					...filtered.slice(0, 5).map((s) => ({
						duration: s,
						durationMs: parseDurationWithChrono(s),
						label: formatDuration(parseDurationWithChrono(s)),
					})),
				];
			}
		}
	}

	if (filtered.length > 0) {
		return filtered.slice(0, 6).map((s) => ({
			duration: s,
			durationMs: parseDurationWithChrono(s),
			label: formatDuration(parseDurationWithChrono(s)),
		}));
	}

	// Fallback: if query exists but no matches, show query as custom duration
	if (query.trim()) {
		const ms = parseDurationWithChrono(query) || 60000;
		return [{ duration: query.trim(), durationMs: ms, label: formatDuration(ms) }];
	}

	return suggestions.slice(0, 6).map((s) => ({
		duration: s,
		durationMs: parseDurationWithChrono(s),
		label: formatDuration(parseDurationWithChrono(s)),
	}));
}

// ─────────────────────────────────────────────────────────────
// Insert Helpers
// ─────────────────────────────────────────────────────────────

export function insertIngredientMention(
	editor: any,
	item: MentionItem
) {
	editor.insertInlineContent([
		{
			type: 'ingredientMention',
			props: {
				id: item.id,
				label: item.name,
				isNew: item.isNew ?? false,
				quantity: item.quantity ? item.quantity.toString() : '',
				unit: item.unit || '',
			},
		},
		' ', // Add space after mention
	] as any);
}

export function insertTimerMention(
	editor: any,
	item: TimerItem
) {
	editor.insertInlineContent([
		{
			type: 'timerMention',
			props: {
				duration: item.duration,
				durationMs: item.durationMs,
			},
		},
		' ', // Add space after mention
	] as any);
}

export function insertRecipeMention(
	editor: any,
	recipe: RecipeReference
) {
	editor.insertInlineContent([
		{
			type: 'recipeMention',
			props: {
				id: recipe.id,
				title: recipe.title,
			},
		},
		' ',
	] as any);
}
