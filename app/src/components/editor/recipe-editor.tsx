'use client';

import { forwardRef, useImperativeHandle, useState, useMemo, useCallback } from 'react';
import { Clock, Utensils } from 'lucide-react';
import { BlockNoteSchema, defaultInlineContentSpecs } from '@blocknote/core';
import { useCreateBlockNote, SuggestionMenuController } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';

import {
	IngredientMention,
	TimerMention,
	formatDuration,
} from './blocknote-schema';
import { useTheme } from '@/components/theme-provider';
import {
	getMentionItems,
	getTimerItems,
	insertIngredientMention,
	insertTimerMention,
	type IngredientMention as IngredientMentionType,
	type TimerMention as TimerMentionType,
	parseDurationWithChrono,
} from './suggestion-items';

// Re-export types for external use
export type { IngredientMention, TimerMention } from './suggestion-items';

// ─────────────────────────────────────────────────────────────
// Schema with custom inline content
// ─────────────────────────────────────────────────────────────

const schema = BlockNoteSchema.create({
	inlineContentSpecs: {
		...defaultInlineContentSpecs,
		ingredientMention: IngredientMention,
		timerMention: TimerMention,
	},
});

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

// Use a simpler Block type for external API to avoid BlockNote's complex generics
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlockType = any;

export interface RecipeEditorRef {
	getHTML: () => string;
	getJSON: () => BlockType[];
	getIngredients: () => IngredientMentionType[];
	getTimers: () => TimerMentionType[];
}

interface RecipeEditorProps {
	content?: string | BlockType[];
	onChange?: (html: string) => void;
	onJSONChange?: (blocks: BlockType[]) => void;
	onIngredientsChange?: (ingredients: IngredientMentionType[]) => void;
	existingIngredients?: IngredientMentionType[];
	placeholder?: string;
	editable?: boolean;
	className?: string;
}

// ─────────────────────────────────────────────────────────────
// Helper: Extract mentions from blocks
// ─────────────────────────────────────────────────────────────

function extractIngredientsFromBlocks(blocks: BlockType[]): IngredientMentionType[] {
	const ingredients: IngredientMentionType[] = [];

	function traverse(node: unknown) {
		if (!node || typeof node !== 'object') return;

		const obj = node as Record<string, unknown>;

		if (obj.type === 'ingredientMention' && obj.props) {
			const props = obj.props as Record<string, unknown>;
			const id = props.id as string;
			const label = props.label as string;

			if (id && label) {
				ingredients.push({
					id,
					name: label,
					quantity: props.quantity ? Number(props.quantity) : undefined,
					unit: (props.unit as string) || undefined,
				});
			}
		}

		// Traverse children/content
		if (Array.isArray(obj.content)) {
			obj.content.forEach(traverse);
		}
		if (Array.isArray(obj.children)) {
			obj.children.forEach(traverse);
		}
	}

	blocks.forEach(traverse);
	return ingredients;
}

function extractTimersFromBlocks(blocks: BlockType[]): TimerMentionType[] {
	const timers: TimerMentionType[] = [];
	let counter = 0;

	function traverse(node: unknown) {
		if (!node || typeof node !== 'object') return;

		const obj = node as Record<string, unknown>;

		if (obj.type === 'timerMention' && obj.props) {
			const props = obj.props as Record<string, unknown>;
			const duration = props.duration as string;
			const durationMs = (props.durationMs as number) || parseDurationWithChrono(duration);

			timers.push({
				id: `timer-${Date.now()}-${counter++}`,
				duration,
				durationMs,
			});
		}

		if (Array.isArray(obj.content)) {
			obj.content.forEach(traverse);
		}
		if (Array.isArray(obj.children)) {
			obj.children.forEach(traverse);
		}
	}

	blocks.forEach(traverse);
	return timers;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export const RecipeEditor = forwardRef<RecipeEditorRef, RecipeEditorProps>(
	(
		{
			content,
			onChange,
			onJSONChange,
			onIngredientsChange,
			existingIngredients = [],
			placeholder = 'Use @ to add ingredients, # to add timers',
			editable = true,
			className,
		},
		ref
	) => {
		const [extractedIngredients, setExtractedIngredients] = useState<IngredientMentionType[]>([]);

		// Parse initial content
		const initialContent = useMemo(() => {
			if (!content) return undefined;

			// If it's already blocks array
			if (Array.isArray(content)) {
				return content;
			}

			// If it's a string, try to parse as JSON first
			if (typeof content === 'string') {
				try {
					const parsed = JSON.parse(content);
					if (Array.isArray(parsed)) {
						return parsed;
					}
				} catch {
					// Not JSON - return undefined and let BlockNote use defaults
					// TODO: Could convert HTML to BlockNote format in the future
				}
			}

			return undefined;
		}, [content]);

		const editor = useCreateBlockNote({
			schema,
			initialContent,
			placeholders: {
				default: placeholder,
			},
		});

		// Handle changes
		const handleChange = useCallback(() => {
			const blocks = editor.document;

			onChange?.('');
			onJSONChange?.(blocks);

			const ingredients = extractIngredientsFromBlocks(blocks);
			setExtractedIngredients(ingredients);
			onIngredientsChange?.(ingredients);
		}, [editor, onChange, onJSONChange, onIngredientsChange]);

		// Expose ref methods
		useImperativeHandle(
			ref,
			() => ({
				getHTML: () => '',
				getJSON: () => editor.document,
				getIngredients: () => extractedIngredients,
				getTimers: () => extractTimersFromBlocks(editor.document),
			}),
			[editor, extractedIngredients]
		);

		// Memoized suggestion items getters
		const getMentionItemsMemoized = useCallback(
			(query: string) => getMentionItems(query, existingIngredients),
			[existingIngredients]
		);

		const { resolvedTheme } = useTheme();

		return (
			<div className={className}>
				<BlockNoteView
					editor={editor}
					editable={editable}
					onChange={handleChange}
					theme={resolvedTheme}
					className='[&>.bn-editor]:!bg-transparent'
				>
					{/* @ mention menu for ingredients */}
					<SuggestionMenuController
						triggerCharacter="@"
						getItems={async (query) => {
							const items = getMentionItemsMemoized(query);
							return items.map((item) => {
								let title = item.name;
								if (item.type === 'ingredient') {
									if (item.isNew) {
										title = `Create "${item.name}"`;
									} else if (item.quantity || item.unit) {
										title = `${item.name} (${item.quantity || ''} ${item.unit || ''})`.trim().replace(' )', ')');
									}
								}

								return {
									title,
									icon: <Utensils className="w-4 h-4" />,
									onItemClick: () => insertIngredientMention(editor, item),
									group: 'Ingredients',
								};
							});
						}}
					/>

					{/* # timer menu - minQueryLength=1 prevents triggering on "# " (headings) */}
					<SuggestionMenuController
						triggerCharacter="#"
						minQueryLength={1}
						getItems={async (query) => {
							const items = getTimerItems(query);
							return items.map((item) => ({
								title: `⏱️ ${item.label}`,
								onItemClick: () => insertTimerMention(editor, item),
								group: 'Timers',
							}));
						}}
					/>
				</BlockNoteView>
			</div>
		);
	}
);

RecipeEditor.displayName = 'RecipeEditor';

// Re-export formatDuration for external use
export { formatDuration };
