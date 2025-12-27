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
	onTimerClick?: (duration: string, durationMs: number) => void;
	onIngredientHover?: (name: string | null) => void;
}

/**
 * Read-only viewer for BlockNote recipe content.
 * Renders the BlockNote JSON with interactive timers.
 */
export function RecipeViewer({ content, className, onTimerClick, onIngredientHover }: RecipeViewerProps) {
	// Parse the content
	const initialContent = useMemo(() => {
		if (!content) return undefined;

		try {
			const parsed = JSON.parse(content);
			if (Array.isArray(parsed)) {
				return parsed;
			}
		} catch {
			// Not valid JSON - might be old HTML content
			// Return undefined to show empty state
		}

		return undefined;
	}, [content]);

	const editor = useCreateBlockNote({
		schema,
		initialContent,
	});

	// Handle clicks on timer mentions
	const handleClick = (e: React.MouseEvent) => {
		const target = e.target as HTMLElement;
		const timerButton = target.closest('.timer-mention') as HTMLElement;
		if (timerButton && onTimerClick) {
			const duration = timerButton.dataset.timer;
			const durationMs = parseInt(timerButton.dataset.timerMs || '60000');
			if (duration) {
				onTimerClick(duration, durationMs);
			}
		}
	};

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

	return (
		<div
			className={className}
			onClick={handleClick}
			onMouseOver={handleMouseOver}
			onMouseOut={handleMouseOut}
		>
			<BlockNoteView
				editor={editor}
				editable={false}
				theme="light"
				linkToolbar={false}
				formattingToolbar={false}
				sideMenu={false}
				slashMenu={false}
				className='bg-transparent [&>.bn-editor]:!bg-transparent [&>.bn-editor]:!px-0'
			/>
		</div>
	);
}
