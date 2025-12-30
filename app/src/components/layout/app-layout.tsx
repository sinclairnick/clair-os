import { useNavigate, Navigate, Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { NuqsAdapter } from 'nuqs/adapters/react'
import { useAuth } from "@/components/auth-provider";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { checkTimerCompletions, useTimerStore } from "@/lib/timer-store";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { PushPrompt } from "./push-prompt";

// Alarm sound using Web Audio API
const playAlarm = () => {
	try {
		const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

		const playTone = (freq: number, startTime: number, duration: number) => {
			const osc = audioCtx.createOscillator();
			const gain = audioCtx.createGain();

			osc.type = 'sine';
			osc.frequency.setValueAtTime(freq, startTime);

			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
			gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

			osc.connect(gain);
			gain.connect(audioCtx.destination);

			osc.start(startTime);
			osc.stop(startTime + duration);
		};

		// "Ding-ding" pattern
		const now = audioCtx.currentTime;
		playTone(880, now, 0.5); // A5
		playTone(1046.5, now + 0.6, 0.8); // C6
	} catch (e) {
		console.warn("Failed to play alarm sound", e);
	}
};

const sendNotification = async (title: string, body: string, recipeId?: string) => {
	if (!("Notification" in window)) return;

	if (Notification.permission === "granted") {
		const notification = new Notification(title, { body, icon: "/pwa-192x192.png" });
		notification.onclick = () => {
			window.focus();
			if (recipeId) window.location.href = ROUTES.RECIPE_DETAIL(recipeId);
		};
	} else if (Notification.permission === "default") {
		// We don't request permission here as it's not a user-triggered event typically
		// and it's handled by PushPrompt or SettingsPage
	}
};

export function AppLayout() {
	const { currentFamily, families, isLoading } = useAuth();
	const location = useLocation();
	const navigate = useNavigate();

	// Global timer ticker
	useEffect(() => {
		let previousCompletedIds = new Set(
			Object.values(useTimerStore.getState().timers)
				.filter(t => t.status === 'completed')
				.map(t => t.id)
		);

		const interval = setInterval(() => {
			checkTimerCompletions();

			// Check for new completions
			const currentTimers = useTimerStore.getState().timers;
			const isFocused = document.hasFocus();

			for (const id in currentTimers) {
				const timer = currentTimers[id];
				if (timer.status === 'completed' && !previousCompletedIds.has(id)) {
					// New completion!
					previousCompletedIds.add(id);
					playAlarm();

					const message = `Timer "${timer.label}" is finished!`;

					if (isFocused) {
						toast.success(message, {
							duration: 10000,
							action: timer.recipeId ? {
								label: "View Recipe",
								onClick: () => navigate(ROUTES.RECIPE_DETAIL(timer.recipeId!))
							} : undefined,
							icon: <Bell className="w-4 h-4" />
						});
					} else {
						sendNotification("ClairOS Timer", message, timer.recipeId);
					}
				} else if (timer.status !== 'completed' && previousCompletedIds.has(id)) {
					// Reset or restarted
					previousCompletedIds.delete(id);
				}
			}
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	// Redirect to family selection if no family is selected and we're not already there
	if (!isLoading && families.length === 0 && location.pathname !== '/family') {
		return <Navigate to="/family" replace />;
	}

	// If user has families but none selected, redirect to select one
	if (!isLoading && families.length > 0 && !currentFamily && location.pathname !== '/family') {
		return <Navigate to="/family" replace />;
	}

	return (
		<NuqsAdapter>
			<div className="min-h-screen bg-background text-foreground">
				<div className="flex h-screen overflow-hidden">
					{/* Desktop Sidebar */}
					<aside className="hidden md:flex md:w-64 md:flex-shrink-0">
						<div className="flex flex-col w-full bg-sidebar border-r border-sidebar-border h-full">
							<Sidebar />
						</div>
					</aside>

					{/* Main content */}
					<main className="flex-1 overflow-y-auto pb-16 md:pb-0 h-full">
						<div className="container mx-auto p-4 md:p-6 lg:p-8">
							<Outlet />
						</div>
					</main>
				</div>

				{/* Mobile bottom nav */}
				<div className="md:hidden">
					<MobileNav />
				</div>

				<PushPrompt />
			</div>
		</NuqsAdapter>
	);
}
