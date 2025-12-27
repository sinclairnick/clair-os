'use client';

import { createReactInlineContentSpec, useBlockNoteEditor } from '@blocknote/react';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";

// ─────────────────────────────────────────────────────────────
// Ingredient Mention - @ingredient
// ─────────────────────────────────────────────────────────────

export const IngredientMention = createReactInlineContentSpec(
	{
		type: 'ingredientMention',
		propSchema: {
			id: { default: '' },
			label: { default: '' },
			isNew: { default: false },
			quantity: { default: '' },
			unit: { default: '' },
		},
		content: 'none',
	} as const,
	{
		render: ({ inlineContent }) => {
			// specific hook usage for BlockNote context
			const editor = useBlockNoteEditor();
			const isEditable = editor.isEditable;

			const { id, label, quantity, unit } = inlineContent.props;

			const mention = (
				<span
					className="ingredient-mention inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-primary/10 text-primary font-medium text-sm cursor-pointer"
					data-ingredient={id}
					data-ingredient-name={label}
				>
					@{label}
				</span>
			);

			// In editor mode, just show the plain mention
			if (isEditable) {
				return mention;
			}

			// In viewer mode, show tooltip with details
			return (
				<TooltipProvider>
					<Tooltip delayDuration={300}>
						<TooltipTrigger asChild>
							{mention}
						</TooltipTrigger>
						<TooltipContent>
							<p className="font-medium capitalize">
								{quantity} {unit} {label}
							</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			);
		},
	}
);

// ─────────────────────────────────────────────────────────────
// Timer Mention - #duration
// ─────────────────────────────────────────────────────────────

export const TimerMention = createReactInlineContentSpec(
	{
		type: 'timerMention',
		propSchema: {
			duration: { default: '' },
			durationMs: { default: 0 },
		},
		content: 'none',
	} as const,
	{
		render: ({ inlineContent }) => {
			const editor = useBlockNoteEditor();
			const isEditable = editor.isEditable;

			const { duration, durationMs } = inlineContent.props;
			const ms = durationMs;
			const formatted = formatDuration(ms);

			const badge = (
				<button
					type="button"
					className="timer-mention inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-full bg-accent text-accent-foreground font-medium text-sm cursor-pointer hover:bg-accent/80 transition-colors"
					data-timer={duration}
					data-timer-ms={ms.toString()}
				>
					⏱️ {formatted}
				</button>
			);

			if (isEditable) {
				return badge;
			}

			// In viewer mode, show hover card
			// Note: The click handler for the timer is still handled by event delegation in RecipeViewer
			// but we can add more info or actions in the hover card if needed.
			return (
				<HoverCard openDelay={200}>
					<HoverCardTrigger asChild>
						{badge}
					</HoverCardTrigger>
					<HoverCardContent className="w-60">
						<div className="space-y-2">
							<h4 className="text-sm font-semibold flex items-center gap-2">
								<span className="text-xl">⏱️</span> {duration || formatted}
							</h4>
							<p className="text-sm text-muted-foreground">
								Click to start this timer.
							</p>
							<div className="text-xs text-muted-foreground pt-2 border-t mt-2">
								Duration: {formatDuration(ms)}
							</div>
						</div>
					</HoverCardContent>
				</HoverCard>
			);
		},
	}
);

// ─────────────────────────────────────────────────────────────
// Recipe Mention - @recipe (future-proofing)
// ─────────────────────────────────────────────────────────────

export const RecipeMention = createReactInlineContentSpec(
	{
		type: 'recipeMention',
		propSchema: {
			id: { default: '' },
			title: { default: '' },
		},
		content: 'none',
	} as const,
	{
		render: ({ inlineContent }) => (
			<span
				className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-secondary text-secondary-foreground font-medium text-sm"
				data-recipe={inlineContent.props.id}
			>
				📖 {inlineContent.props.title}
			</span>
		),
	}
);

// ─────────────────────────────────────────────────────────────
// Duration Utilities
// ─────────────────────────────────────────────────────────────

export function formatDuration(ms: number): string {
	const hours = Math.floor(ms / (60 * 60 * 1000));
	const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
	const seconds = Math.floor((ms % (60 * 1000)) / 1000);

	if (hours && minutes) return `${hours}h ${minutes}m`;
	if (hours) return `${hours}h`;
	if (minutes) return `${minutes}m`;
	if (seconds) return `${seconds}s`;
	return '1m';
}
