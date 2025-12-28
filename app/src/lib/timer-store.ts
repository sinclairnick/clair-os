import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Timer {
	id: string;
	label: string;
	durationMs: number;
	remainingMs: number;
	status: 'idle' | 'running' | 'paused' | 'completed';
	startedAt?: number; // The wall clock time when it last became 'running'
	recipeId?: string; // Optional context
}

interface TimerState {
	timers: Record<string, Timer>;

	// Actions
	addTimer: (id: string, label: string, durationMs: number, recipeId?: string) => void;
	removeTimer: (id: string) => void;
	startTimer: (id: string) => void;
	pauseTimer: (id: string) => void;
	resetTimer: (id: string) => void;
	completeTimer: (id: string) => void;
}

/**
 * Utility to get the current "live" remaining time for a timer
 */
export const getLiveRemainingMs = (timer: Timer) => {
	if (timer.status === 'running' && timer.startedAt) {
		const elapsedSinceStart = Date.now() - timer.startedAt;
		return Math.max(0, timer.remainingMs - elapsedSinceStart);
	}
	return timer.remainingMs;
};

export const useTimerStore = create<TimerState>()(
	persist(
		(set) => ({
			timers: {},

			addTimer: (id, label, durationMs, recipeId) => set((state) => {
				// If exists, just ensure recipeId is updated if it was missing
				if (state.timers[id]) {
					if (recipeId && !state.timers[id].recipeId) {
						return {
							timers: {
								...state.timers,
								[id]: { ...state.timers[id], recipeId }
							}
						};
					}
					return state;
				}
				return {
					timers: {
						...state.timers,
						[id]: {
							id,
							label,
							durationMs,
							remainingMs: durationMs,
							status: 'idle',
							recipeId
						}
					}
				};
			}),

			removeTimer: (id) => set((state) => {
				const { [id]: _, ...rest } = state.timers;
				return { timers: rest };
			}),

			startTimer: (id) => set((state) => {
				const timer = state.timers[id];
				if (!timer || timer.status === 'running') return state;

				// If it was completed, reset it automatically when starting
				const baseRemaining = timer.status === 'completed' ? timer.durationMs : timer.remainingMs;

				return {
					timers: {
						...state.timers,
						[id]: {
							...timer,
							remainingMs: baseRemaining,
							status: 'running',
							startedAt: Date.now()
						}
					}
				};
			}),

			pauseTimer: (id) => set((state) => {
				const timer = state.timers[id];
				if (!timer || timer.status !== 'running' || !timer.startedAt) return state;

				const liveRemaining = getLiveRemainingMs(timer);

				return {
					timers: {
						...state.timers,
						[id]: {
							...timer,
							status: 'paused',
							remainingMs: liveRemaining,
							startedAt: undefined
						}
					}
				};
			}),

			resetTimer: (id) => set((state) => {
				const timer = state.timers[id];
				if (!timer) return state;
				return {
					timers: {
						...state.timers,
						[id]: {
							...timer,
							status: 'idle',
							remainingMs: timer.durationMs,
							startedAt: undefined
						}
					}
				};
			}),

			completeTimer: (id) => set((state) => {
				const timer = state.timers[id];
				if (!timer || timer.status === 'completed') return state;
				return {
					timers: {
						...state.timers,
						[id]: {
							...timer,
							status: 'completed',
							remainingMs: 0,
							startedAt: undefined
						}
					}
				};
			})
		}),
		{
			name: 'timer-storage',
			partialize: (state) => ({ timers: state.timers }),
		}
	)
);

/**
 * Global tick that only updates state on completion events.
 * This avoids per-second localStorage writes while still enabling
 * global completion detection.
 */
export const checkTimerCompletions = () => {
	const state = useTimerStore.getState();
	const timers = state.timers;
	let anyCompleted = false;

	for (const id in timers) {
		const timer = timers[id];
		if (timer.status === 'running') {
			const remaining = getLiveRemainingMs(timer);
			if (remaining <= 0) {
				state.completeTimer(id);
				anyCompleted = true;
			}
		}
	}

	return anyCompleted;
};
