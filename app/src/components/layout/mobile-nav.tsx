import { NavLink } from "react-router";
import {
	Home,
	CookingPot,
	ShoppingCart,
	CheckSquare,
	Calendar,
	MoreHorizontal,
	Users,
	User,
	LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

const navItems = [
	{ to: ROUTES.HOME, label: "Home", icon: Home },
	{ to: ROUTES.RECIPES, label: "Recipes", icon: CookingPot },
	{ to: ROUTES.SHOPPING, label: "Shopping", icon: ShoppingCart },
	{ to: ROUTES.TASKS, label: "Tasks", icon: CheckSquare },
];

export function MobileNav() {
	const { user, signOut } = useAuth();

	return (
		<nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
			<div className="flex justify-around items-center h-16 px-2">
				{navItems.map((item) => (
					<NavLink
						key={item.to}
						to={item.to}
						end={item.to === "/"}
						className={({ isActive }) =>
							cn(
								"flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[56px]",
								isActive
									? "text-primary"
									: "text-muted-foreground hover:text-foreground"
							)
						}
					>
						<item.icon className="w-5 h-5" />
						<span className="text-xs font-medium">{item.label}</span>
					</NavLink>
				))}

				<Popover>
					<PopoverTrigger render={
						<button className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground min-w-[56px]">
							<MoreHorizontal className="w-5 h-5" />
							<span className="text-xs font-medium">More</span>
						</button>
					} />
					<PopoverContent align="end" side="top" className="w-56 p-2">
						<div className="grid gap-1">
							<NavLink
								to={ROUTES.CALENDAR}
								className={({ isActive }) =>
									cn(
										"flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
										isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted"
									)
								}
							>
								<Calendar className="w-4 h-4" />
								Calendar
							</NavLink>
							<NavLink
								to={ROUTES.FAMILY_SETTINGS}
								className={({ isActive }) =>
									cn(
										"flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
										isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted"
									)
								}
							>
								<Users className="w-4 h-4" />
								Family Settings
							</NavLink>
							<NavLink
								to={ROUTES.SETTINGS}
								className={({ isActive }) =>
									cn(
										"flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
										isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted"
									)
								}
							>
								<User className="w-4 h-4" />
								Personal Settings
							</NavLink>

							<div className="h-px bg-border my-1" />

							{user && (
								<div className="px-3 py-2 mb-1">
									<p className="text-xs font-medium truncate">{user.name}</p>
									<p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
								</div>
							)}

							<Button
								variant="ghost"
								size="sm"
								className="justify-start gap-3 h-9 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
								onClick={signOut}
							>
								<LogOut className="w-4 h-4" />
								Sign Out
							</Button>
						</div>
					</PopoverContent>
				</Popover>
			</div>
		</nav>
	);
}
