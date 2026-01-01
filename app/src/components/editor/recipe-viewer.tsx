'use client';

import { useMemo, useEffect, useRef } from 'react';
import { BlockNoteSchema, defaultInlineContentSpecs } from '@blocknote/core';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';

import {
	IngredientMention,
	TimerMention,
} from './blocknote-schema';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

// Use the same schema as the editor
const schema = BlockNoteSchema.create({
	inlineContentSpecs: {
		...defaultInlineContentSpecs,
		ingredientMention: IngredientMention,
		timerMention: TimerMention,
	},
});

interface RecipeViewerProps {
	content: string; // JSON string of BlockNote blocks
	className?: string;
	recipeId: string;
	checkedInstructions?: string[];
	onToggleInstruction?: (id: string, totalCount: number) => void;
	onIngredientHover?: (name: string | null) => void;
}

/**
 * Read-only viewer for BlockNote recipe content.
 * Renders the BlockNote JSON with interactive timers.
 */
export function RecipeViewer({
	content,
	className,
	recipeId,
	checkedInstructions = [],
	onToggleInstruction,
	onIngredientHover
}: RecipeViewerProps) {
	const isLocalUpdateRef = useRef(false);
	// Parse the content and count instructions
	const { initialContent, totalInstructions } = useMemo(() => {
		if (!content) return { initialContent: undefined, totalInstructions: 0 };

		let totalCount = 0;
		try {
			const parsed = JSON.parse(content);
			if (Array.isArray(parsed)) {
				// Patch timers and headings with deterministic IDs for persistence
				let timerIndex = 0;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const traverse = (node: any) => {
					// Count headings as instructions and patch with stable IDs
					if (node.type === 'heading') {
						node.id = `instr-${totalCount}`;
						totalCount++;
					}

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
				return { initialContent: parsed, totalInstructions: totalCount };
			}
		} catch {
			// Not valid JSON - might be old HTML content
		}

		return { initialContent: undefined, totalInstructions: 0 };
	}, [content, recipeId]);

	const editor = useCreateBlockNote({
		schema,
		initialContent,
	});

	// Efficiently sync the checked state to the DOM
	useEffect(() => {
		if (!checkedInstructions) return;

		// Skip if this change was triggered by our own click handler
		// We use basic array comparison as a heuristic
		if (isLocalUpdateRef.current) {
			isLocalUpdateRef.current = false;
			return;
		}

		// We use a small timeout to ensure the editor has finished rendering
		const syncCheckedState = () => {
			// Clear all existing checked classes first
			const checkedElements = document.querySelectorAll('.recipe-viewer-checkable .is-checked');
			checkedElements.forEach(el => el.classList.remove('is-checked'));

			// Apply is-checked ONLY to the actual block element
			checkedInstructions.forEach(id => {
				const block = document.querySelector(`.recipe-viewer-checkable .bn-block[data-id="${id}"]`);
				if (block) {
					block.classList.add('is-checked');
				} else {
					// Fallback to any element with the id if .bn-block isn't used
					const elements = document.querySelectorAll(`.recipe-viewer-checkable [data-id="${id}"]`);
					elements.forEach(el => el.classList.add('is-checked'));
				}
			});
		};

		// Initial sync
		const timer = setTimeout(syncCheckedState, 150);
		const backupTimer = setTimeout(syncCheckedState, 500);

		return () => {
			clearTimeout(timer);
			clearTimeout(backupTimer);
		};
	}, [recipeId, checkedInstructions]); // Sync on external state changes

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

	// Handle checking off steps
	const handleClick = (e: React.MouseEvent) => {
		const target = e.target as HTMLElement;

		// Don't toggle if clicking an interactive element like a mention or a button
		if (target.closest('.ingredient-mention, .timer-mention, button, a')) {
			return;
		}

		const heading = target.closest('h1, h2, h3');
		if (heading) {
			const blockElement = heading.closest('[data-id]') as HTMLElement;
			if (blockElement && onToggleInstruction) {
				const blockId = blockElement.dataset.id;
				if (blockId) {
					// Mark as local update to prevent the useEffect from doing a full re-sync
					isLocalUpdateRef.current = true;

					// 1. Immediate UI update (Uncontrolled)
					// Find ALL elements that might have this ID and toggle them to avoid ghosting
					const relatedElements = document.querySelectorAll(`.recipe-viewer-checkable [data-id="${blockId}"]`);
					const isChecking = !blockElement.classList.contains('is-checked');

					relatedElements.forEach(el => {
						if (isChecking) {
							el.classList.add('is-checked');
						} else {
							el.classList.remove('is-checked');
							// Also clear any accidental internal ones
							el.querySelectorAll('.is-checked').forEach(inner => inner.classList.remove('is-checked'));
						}
					});

					// 2. Notify parent with the actual state change
					onToggleInstruction(blockId, totalInstructions);
				}
			}
		}
	};

	return (
		<div
			className={cn('recipe-viewer-checkable', className)}
			onMouseOver={handleMouseOver}
			onMouseOut={handleMouseOut}
			onClick={handleClick}
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
