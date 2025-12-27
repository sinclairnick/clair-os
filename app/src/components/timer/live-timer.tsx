import type { Timer } from "@/lib/timer-store";
import { getLiveRemainingMs } from "@/lib/timer-store";
import { useTimerTick } from "@/hooks/use-timer-tick";

interface LiveTimerProps {
	timer: Timer;
	formatter?: (ms: number) => string;
}

const defaultFormatter = (ms: number) => {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Renders just the counting down time string.
 * Isolates re-renders to just this tiny component.
 */
export function LiveTimerText({ timer, formatter = defaultFormatter }: LiveTimerProps) {
	useTimerTick(timer.status === 'running');
	return <>{formatter(getLiveRemainingMs(timer))}</>;
}

/**
 * Renders a progress bar that updates in real-time.
 * Isolates re-renders to just the progress bar.
 */
export function LiveTimerProgress({
	timer,
	className,
	style
}: {
	timer: Timer;
	className?: string;
	style?: React.CSSProperties;
}) {
	useTimerTick(timer.status === 'running');

	const progress = (getLiveRemainingMs(timer) / timer.durationMs) * 100;

	return (
		<div
			className={className}
			style={{
				...style,
				width: `${Math.max(0, Math.min(100, progress))}%`
			}}
		/>
	);
}
