import { useEffect, useState } from "react";
import { pushManager } from "@/lib/push-manager";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { useAuth } from "@/components/auth-provider";


export function PushPrompt() {
	const { user } = useAuth();
	const [shouldShow, setShouldShow] = useState(false);

	useEffect(() => {
		if (!user) return;

		const checkStatus = async () => {
			if (!(await pushManager.isSupported())) return;

			const status = await pushManager.getStatus();

			if (status === 'unsubscribed') {
				// We wait a bit to NOT overwhelm the user immediately
				const timer = setTimeout(() => {
					setShouldShow(true);
				}, 5000);
				return () => clearTimeout(timer);
			}
		};

		checkStatus();
	}, [user?.id]);

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
