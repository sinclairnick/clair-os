import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/components/auth-provider";
import { Sun, Moon, Monitor, Users, ChevronRight } from "lucide-react";
import { ROUTES } from "@/lib/routes";

export function SettingsPage() {
	const { theme, setTheme } = useTheme();
	const { currentFamily } = useAuth();

	return (
		<div className="space-y-6">
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

			<Link to={ROUTES.FAMILY_MANAGE} className="block">
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
