'use client';

import { useEffect } from 'react';
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
import { useTimerStore } from "@/lib/timer-store";
import { LiveTimerText } from "@/components/timer/live-timer";
import { Play, Pause, RotateCcw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
			id: { default: '' },
			recipeId: { default: '' },
			duration: { default: '' },
			durationMs: { default: 0 },
		},
		content: 'none',
	} as const,
	{
		render: ({ inlineContent }) => {
			const editor = useBlockNoteEditor();
			const isEditable = editor.isEditable;

			// We need to cast because we added custom props that typescript might not know about in the default types immediately
			const { duration, durationMs, id: propId, recipeId } = inlineContent.props as any;
			const ms = durationMs;
			const formatted = formatDuration(ms);

			// If it's editable, we just show the static badge
			if (isEditable) {
				return (
					<button
						type="button"
						className="timer-mention inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-full bg-accent text-accent-foreground font-medium text-sm cursor-pointer hover:bg-accent/80 transition-colors"
						data-timer={duration}
						data-timer-ms={ms.toString()}
					>
						⏱️ {formatted}
					</button>
				);
			}


			const timerState = useTimerStore((state) => state.timers[propId]);
			const { startTimer, pauseTimer, resetTimer, addTimer } = useTimerStore();

			const isRunning = timerState?.status === 'running';
			const isPaused = timerState?.status === 'paused';
			const isCompleted = timerState?.status === 'completed';
			const hasStarted = timerState && (timerState.status !== 'idle' || timerState.remainingMs < ms);

			// Ensure timer is in store with its metadata
			// eslint-disable-next-line react-hooks/rules-of-hooks
			useEffect(() => {
				if (!isEditable && propId && recipeId) {
					addTimer(propId, duration, ms, recipeId);
				}
			}, [addTimer, duration, isEditable, ms, propId, recipeId]);

			const handleClick = (e: React.MouseEvent) => {
				e.stopPropagation();
				e.preventDefault();

				if (!timerState) {
					addTimer(propId, duration, ms, recipeId);
					startTimer(propId);
				} else if (isRunning) {
					pauseTimer(propId);
				} else {
					startTimer(propId);
				}
			};

			const handleReset = (e: React.MouseEvent) => {
				e.stopPropagation();
				e.preventDefault();
				resetTimer(propId);
			};

			const timerFormat = (totalMs: number) => {
				const preciseMs = Math.max(0, totalMs);
				const mins = Math.floor(preciseMs / 60000);
				const secs = Math.floor((preciseMs % 60000) / 1000);
				return `${mins}:${secs.toString().padStart(2, '0')}`;
			};

			const badge = (
				<span
					className={`timer-mention inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded-full font-medium text-sm cursor-pointer transition-all border
						${isRunning ? 'bg-primary/10 text-primary border-primary animate-pulse shadow-sm' : 'bg-accent/50 text-accent-foreground border-transparent hover:bg-accent hover:border-accent-foreground/20'}
						${isPaused ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-500/50' : ''}
						${isCompleted ? 'bg-primary text-primary-foreground border-primary animate-bounce' : ''}
					`}
					onClick={handleClick}
					data-timer-id={propId}
				>
					{isCompleted ? '🔔' : (isRunning ? '⏳' : '⏱️')}
					<span>
						{hasStarted && timerState ? (
							<LiveTimerText timer={timerState} formatter={timerFormat} />
						) : (
							formatted
						)}
						{hasStarted && !isCompleted && (
							<span className="opacity-50 font-normal text-[10px] ml-1">
								/ {formatted}
							</span>
						)}
					</span>

					{hasStarted && (
						<div className="flex items-center gap-1 ml-1 pl-1 border-l border-current/20">
							<button
								onClick={handleReset}
								className="p-0.5 hover:bg-foreground/10 rounded-full transition-colors"
								title="Reset"
							>
								<RotateCcw className="w-3 h-3" />
							</button>
						</div>
					)}
				</span>
			);

			return (
				<HoverCard>
					<HoverCardTrigger>
						{badge}
					</HoverCardTrigger>
					<HoverCardContent className="w-64 p-4 shadow-xl border-2" sideOffset={16}>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h4 className="text-sm font-bold flex items-center gap-2">
									<Clock className="w-4 h-4" /> {duration || "Timer"}
								</h4>
								<span className="text-[10px] uppercase tracking-wider font-semibold opacity-50">
									{timerState?.status || 'idle'}
								</span>
							</div>

							<div className={cn(
								"text-3xl font-mono py-4 text-center rounded-lg border-2 transition-colors",
								isRunning ? "bg-primary/5 border-primary/20 text-primary" : "bg-muted border-transparent"
							)}>
								{hasStarted && timerState ? (
									<LiveTimerText timer={timerState} formatter={timerFormat} />
								) : (
									timerFormat(ms)
								)}
							</div>

							<div className="flex gap-2">
								<Button
									className="flex-1 gap-2"
									variant={isRunning ? "outline" : "default"}
									onClick={handleClick}
								>
									{isRunning ? (
										<><Pause className="w-4 h-4" /> Pause</>
									) : (
										<><Play className="w-4 h-4" /> {hasStarted ? 'Resume' : 'Start'}</>
									)}
								</Button>
								<Button
									variant="secondary"
									size="icon"
									onClick={handleReset}
									title="Reset"
								>
									<RotateCcw className="w-4 h-4" />
								</Button>
							</div>

							<div className="text-[10px] text-muted-foreground flex justify-between pt-2 border-t">
								<span>Target: {formatted}</span>
								<span>ID: {propId?.split('-').pop()}</span>
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
