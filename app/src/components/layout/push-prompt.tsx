import { useEffect, useState } from "react";
import { pushManager } from "@/lib/push-manager";
import { toast } from "sonner";
import { Bell } from "lucide-react";


export function PushPrompt() {
	const [shouldShow, setShouldShow] = useState(false);

	useEffect(() => {
		const checkStatus = async () => {
			// Don't show if push is not supported
			if (!(await pushManager.isSupported())) return;

			// Don't show if permission is already granted or denied
			if (Notification.permission !== "default") return;

			// Check if already subscribed
			const subscription = await pushManager.getSubscription();
			if (!subscription) {
				// We wait a bit to NOT overwhelm the user immediately
				const timer = setTimeout(() => {
					setShouldShow(true);
				}, 5000);
				return () => clearTimeout(timer);
			}
		};

		checkStatus();
	}, []);

	useEffect(() => {
		if (shouldShow) {
			toast("Enable Notifications?", {
				description: "Get alerts for timers, upcoming events, and shared tasks.",
				duration: Infinity,
				icon: <Bell className="w-4 h-4" />,
				action: {
					label: "Enable",
					onClick: async () => {
						try {
							await pushManager.subscribe();
							toast.success("Notifications enabled!");
						} catch (error: any) {
							toast.error(error.message || "Failed to enable notifications");
						}
					},
				},
				cancel: {
					label: "Later",
					onClick: () => {
						// Optionally store in localStorage to not show again for a while
						localStorage.setItem("push_prompt_dismissed", Date.now().toString());
					},
				},
			});
		}
	}, [shouldShow]);

	return null;
}
