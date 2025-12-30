import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/components/auth-provider";
import { Sun, Moon, Monitor, Users, ChevronRight, Bell, BellOff, Loader2 } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { PageTitle } from "@/components/page-title";
import { useState, useEffect } from "react";
import { pushManager } from "@/lib/push-manager";
import { toast } from "sonner";

export function SettingsPage() {
	const { theme, setTheme } = useTheme();
	const { currentFamily } = useAuth();

	const [isPushSupported, setIsPushSupported] = useState(false);
	const [isSubscribed, setIsSubscribed] = useState(false);
	const [isPushLoading, setIsPushLoading] = useState(true);

	useEffect(() => {
		const checkPushStatus = async () => {
			const supported = await pushManager.isSupported();
			setIsPushSupported(supported);

			if (supported) {
				const subscription = await pushManager.getSubscription();
				setIsSubscribed(!!subscription);
			}
			setIsPushLoading(false);
		};
		checkPushStatus();
	}, []);

	const handleTogglePush = async () => {
		setIsPushLoading(true);
		try {
			if (isSubscribed) {
				await pushManager.unsubscribe();
				setIsSubscribed(false);
				toast.success("Notifications disabled");
			} else {
				await pushManager.subscribe();
				setIsSubscribed(true);
				toast.success("Notifications enabled!");
			}
		} catch (error: any) {
			toast.error(error.message || "Failed to update notification settings");
		} finally {
			setIsPushLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			<PageTitle title="Settings" />
			<div>
				<h1 className="text-2xl font-bold text-foreground">Settings</h1>
				<p className="text-muted-foreground">
					Manage your preferences
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Appearance</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Choose your preferred color scheme
					</p>
					<div className="flex gap-2">
						<Button
							variant={theme === "light" ? "default" : "outline"}
							size="sm"
							onClick={() => setTheme("light")}
						>
							<Sun className="w-4 h-4 mr-2" />
							Light
						</Button>
						<Button
							variant={theme === "dark" ? "default" : "outline"}
							size="sm"
							onClick={() => setTheme("dark")}
						>
							<Moon className="w-4 h-4 mr-2" />
							Dark
						</Button>
						<Button
							variant={theme === "system" ? "default" : "outline"}
							size="sm"
							onClick={() => setTheme("system")}
						>
							<Monitor className="w-4 h-4 mr-2" />
							System
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Notifications Section */}
			<Card>
				<CardHeader>
					<CardTitle>Notifications</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Receive alerts for upcoming events and shared tasks
					</p>
					{!isPushSupported ? (
						<div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 text-muted-foreground text-sm">
							<BellOff className="w-4 h-4" />
							Push notifications are not supported on this browser or device.
						</div>
					) : (
						<Button
							variant={isSubscribed ? "default" : "outline"}
							size="sm"
							onClick={handleTogglePush}
							disabled={isPushLoading}
						>
							{isPushLoading ? (
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							) : isSubscribed ? (
								<Bell className="w-4 h-4 mr-2" />
							) : (
								<BellOff className="w-4 h-4 mr-2" />
							)}
							{isSubscribed ? "Enabled" : "Disabled"}
						</Button>
					)}
				</CardContent>
			</Card>

			<Link to={ROUTES.FAMILY_SETTINGS} className="block">
				<Card className="cursor-pointer hover:border-primary transition-colors group">
					<CardContent className="flex items-center gap-4 p-4">
						<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
							<Users className="w-5 h-5 text-primary" />
						</div>
						<div className="flex-1 min-w-0">
							<h3 className="font-medium">
								{currentFamily?.name ?? "Family"} Settings
							</h3>
							<p className="text-sm text-muted-foreground">
								Manage members and invites
								{currentFamily?.role === "admin" && " · Admin"}
							</p>
						</div>
						<ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
					</CardContent>
				</Card>
			</Link>
		</div>
	);
}
