'use client';

import { useMemo } from 'react';
import { BlockNoteSchema, defaultInlineContentSpecs } from '@blocknote/core';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';

import {
	IngredientMention,
	TimerMention,
	RecipeMention,
} from './blocknote-schema';
import { useTheme } from '@/components/theme-provider';

// Use the same schema as the editor
const schema = BlockNoteSchema.create({
	inlineContentSpecs: {
		...defaultInlineContentSpecs,
		ingredientMention: IngredientMention,
		timerMention: TimerMention,
		recipeMention: RecipeMention,
	},
});

interface RecipeViewerProps {
	content: string; // JSON string of BlockNote blocks
	className?: string;
	recipeId: string;
	onIngredientHover?: (name: string | null) => void;
}

/**
 * Read-only viewer for BlockNote recipe content.
 * Renders the BlockNote JSON with interactive timers.
 */
export function RecipeViewer({ content, className, recipeId, onIngredientHover }: RecipeViewerProps) {
	// Parse the content
	const initialContent = useMemo(() => {
		if (!content) return undefined;

		try {
			const parsed = JSON.parse(content);
			if (Array.isArray(parsed)) {
				// Patch timers with deterministic IDs for persistence
				let timerIndex = 0;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const traverse = (node: any) => {
					if (node.type === 'timerMention') {
						if (!node.props) node.props = {};
						// Assign a stable ID based on recipe and index
						node.props.id = `${recipeId}-timer-${timerIndex++}`;
						node.props.recipeId = recipeId;
					}

					if (node.children && Array.isArray(node.children)) {
						node.children.forEach(traverse);
					}
					if (node.content && Array.isArray(node.content)) {
						node.content.forEach(traverse);
					}
				};

				parsed.forEach(traverse);
				return parsed;
			}
		} catch {
			// Not valid JSON - might be old HTML content
			// Return undefined to show empty state
		}

		return undefined;
	}, [content, recipeId]);

	const editor = useCreateBlockNote({
		schema,
		initialContent,
	});

	// Handle hover for ingredients highlighting
	const handleMouseOver = (e: React.MouseEvent) => {
		if (!onIngredientHover) return;
		const target = e.target as HTMLElement;
		const ingredient = target.closest('.ingredient-mention') as HTMLElement;
		if (ingredient) {
			const name = ingredient.dataset.ingredientName;
			if (name) onIngredientHover(name);
		}
	};

	const handleMouseOut = (e: React.MouseEvent) => {
		if (!onIngredientHover) return;
		const target = e.target as HTMLElement;
		const ingredient = target.closest('.ingredient-mention');
		if (ingredient) {
			onIngredientHover(null);
		}
	};

	// If content couldn't be parsed, show a fallback
	if (!initialContent) {
		// Try to render as HTML fallback for old content
		if (content && content.trim().startsWith('<')) {
			return (
				<div
					className={`prose prose-sm max-w-none ${className || ''}`}
					dangerouslySetInnerHTML={{ __html: content }}
				/>
			);
		}

		return (
			<div className={`text-muted-foreground text-sm ${className || ''}`}>
				No instructions available.
			</div>
		);
	}

	const { resolvedTheme } = useTheme();

	return (
		<div
			className={className}
			onMouseOver={handleMouseOver}
			onMouseOut={handleMouseOut}
		>
			<BlockNoteView
				editor={editor}
				editable={false}
				theme={resolvedTheme}
				linkToolbar={false}
				formattingToolbar={false}
				sideMenu={false}
				slashMenu={false}
				className='bg-transparent [&>.bn-editor]:!bg-transparent [&>.bn-editor]:!px-0'
			/>
		</div>
	);
}
