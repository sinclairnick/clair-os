import { NavLink, Link, useNavigate } from "react-router";
import {
	Home,
	CookingPot,
	ShoppingCart,
	CheckSquare,
	Calendar,
	LogOut,
	ChevronDown,
	Clock,
	Play,
	Pause,
	RotateCcw,
	X,
	ExternalLink,
	BookOpen,
	Users,
	User,
	ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTimerStore } from "@/lib/timer-store";
import { useWatchedRecipesStore } from "@/lib/watched-recipes-store";
import { LiveTimerText } from "@/components/timer/live-timer";
import { ROUTES } from "@/lib/routes";

const navItems = [
	{ to: ROUTES.HOME, label: "Home", icon: Home },
	{ to: ROUTES.RECIPES, label: "Recipes", icon: CookingPot },
	{ to: ROUTES.SHOPPING, label: "Shopping", icon: ShoppingCart },
	{ to: ROUTES.TASKS, label: "Tasks", icon: CheckSquare },
	{ to: ROUTES.CALENDAR, label: "Calendar", icon: Calendar },
	{ to: ROUTES.FAMILY_SETTINGS, label: "Family Settings", icon: Users },
];

export function Sidebar() {
	const navigate = useNavigate();
	const { user, families, currentFamily, setCurrentFamilyId, signOut } = useAuth();
	const { timers, startTimer, pauseTimer, resetTimer, removeTimer } = useTimerStore();

	// Show active/paused/completed timers in the sidebar
	const activeTimers = Object.values(timers).filter(timer => timer.status !== 'idle');

	// Watched recipes from the store
	const { recipes: watchedRecipes, removeRecipe } = useWatchedRecipesStore();
	const watchedRecipesList = Object.values(watchedRecipes).sort((a, b) => b.addedAt - a.addedAt);

	return (
		<div className="flex flex-col h-full bg-sidebar">
			{/* Logo & Family Selector */}
			<div className="p-4 border-b border-sidebar-border">
				<div className="flex items-center gap-2 mb-3">
					<img src="/icon-raw.png" alt="ClairOS Logo" className="w-16 h-16 object-contain" />
					<span className="text-xl font-semibold text-sidebar-foreground">
						ClairOS
					</span>
				</div>

				{families.length > 0 && (
					<DropdownMenu>
						<DropdownMenuTrigger render={
							<Button
								variant="outline"
								className="w-full justify-between text-sm bg-background/50"
								size="sm"
							>
								<span className="truncate">{currentFamily?.name || 'Select Family'}</span>
								<ChevronDown className="w-4 h-4 ml-2 shrink-0 opacity-50" />
							</Button>
						} />
						<DropdownMenuContent align="start" className="w-56">
							{families.map((family) => (
								<DropdownMenuItem
									key={family.id}
									onClick={() => setCurrentFamilyId(family.id)}
									className={cn(
										currentFamily?.id === family.id && "bg-accent"
									)}
								>
									<span
										className="w-2 h-2 rounded-full mr-2"
										style={{ backgroundColor: family.color }}
									/>
									{family.name}
									<span className="ml-auto text-xs text-muted-foreground">
										{family.role}
									</span>
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>

			{/* Navigation */}
			<nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
				<div className="space-y-1">
					{navItems.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							end={item.to === "/"}
							className={({ isActive }) =>
								cn(
									"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
									isActive
										? "bg-sidebar-primary text-sidebar-primary-foreground"
										: "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
								)
							}
						>
							<item.icon className="w-5 h-5" />
							{item.label}
						</NavLink>
					))}
				</div>

				{/* Active Timers Section */}
				{activeTimers.length > 0 && (
					<div className="mt-8 pt-4 border-t border-sidebar-border">
						<h3 className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2 flex items-center gap-2">
							<Clock className="w-3 h-3" />
							Active Timers
						</h3>
						<div className="space-y-2 px-1">
							{activeTimers.map((timer) => (
								<div
									key={timer.id}
									className={cn(
										"p-2 rounded-md bg-sidebar-accent/50 border border-sidebar-border group relative",
										timer.status === 'completed' && "bg-primary/10 border-primary animate-pulse"
									)}
								>
									<div className="flex items-center justify-between mb-1">
										<div className="flex items-center gap-1 min-w-0 pr-4">
											{timer.recipeId ? (
												<Link
													to={ROUTES.RECIPE_DETAIL(timer.recipeId)}
													className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline group/link"
													title="Go to recipe"
												>
													<span className="truncate max-w-[80px]">{timer.label}</span>
													<ExternalLink className="w-2 h-2 shrink-0 opacity-70 group-hover/link:translate-x-0.5 transition-transform" />
												</Link>
											) : (
												<span className="text-[10px] font-medium text-sidebar-foreground truncate">
													{timer.label}
												</span>
											)}
										</div>
										<button
											onClick={() => removeTimer(timer.id)}
											className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 hover:bg-sidebar-accent rounded-full text-sidebar-foreground/50 hover:text-sidebar-foreground transition-all"
										>
											<X className="w-3 h-3" />
										</button>
									</div>
									<div className="flex items-center justify-between">
										<span className={cn(
											"text-lg font-mono leading-none",
											timer.status === 'completed' ? "text-primary" : "text-sidebar-foreground"
										)}>
											<LiveTimerText timer={timer} />
										</span>
										<div className="flex gap-1">
											<button
												onClick={() => timer.status === 'running' ? pauseTimer(timer.id) : startTimer(timer.id)}
												className="p-1 hover:bg-sidebar-accent rounded-full text-sidebar-foreground transition-colors"
											>
												{timer.status === 'running' ? (
													<Pause className="w-3 h-3" />
												) : (
													<Play className="w-3 h-3 filled" />
												)}
											</button>
											<button
												onClick={() => resetTimer(timer.id)}
												className="p-1 hover:bg-sidebar-accent rounded-full text-sidebar-foreground transition-colors"
											>
												<RotateCcw className="w-3 h-3" />
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Watched Recipes Section */}
				{watchedRecipesList.length > 0 && (
					<div className="mt-6 pt-4 border-t border-sidebar-border">
						<h3 className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2 flex items-center gap-2">
							<BookOpen className="w-3 h-3" />
							Watched Recipes
						</h3>
						<div className="space-y-1 px-1">
							{watchedRecipesList.map((recipe) => {
								const checkedCount = recipe.checkedIngredients.length;
								return (
									<div
										key={recipe.id}
										className="p-2 rounded-md bg-sidebar-accent/50 border border-sidebar-border group relative"
									>
										<div className="flex items-center justify-between">
											<Link
												to={ROUTES.RECIPE_DETAIL(recipe.id)}
												className="flex items-center gap-1 text-xs font-medium text-sidebar-foreground hover:text-primary truncate pr-6"
												title={recipe.title}
											>
												<span className="truncate max-w-[170px]">{recipe.title}</span>
												<ChevronRight className="w-2.5 h-2.5 shrink-0 opacity-50" />
											</Link>
											<button
												onClick={() => removeRecipe(recipe.id)}
												className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 hover:bg-sidebar-accent rounded-full text-sidebar-foreground/50 hover:text-sidebar-foreground transition-all"
												title="Dismiss"
											>
												<X className="w-3 h-3" />
											</button>
										</div>
										<div className="flex items-center gap-2 mt-1 text-[10px] text-sidebar-foreground/60">
											{checkedCount > 0 && (
												<span>{checkedCount} checked</span>
											)}
											{recipe.scaleFactor !== 1 && (
												<span className="text-primary font-medium">{recipe.scaleFactor}x</span>
											)}
											{recipe.explicit && (
												<span className="bg-primary/20 text-primary px-1 rounded">pinned</span>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</nav>

			{/* Bottom section: User Account */}
			<div className="px-3 py-4 border-t border-sidebar-border">
				{user && (
					<DropdownMenu>
						<DropdownMenuTrigger render={
							<button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left group">
								{user.image ? (
									<img
										src={user.image}
										alt={user.name}
										loading="lazy"
										className="w-8 h-8 rounded-full"
									/>
								) : (
									<div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
										{user.name.charAt(0).toUpperCase()}
									</div>
								)}
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium truncate text-sidebar-foreground group-hover:text-sidebar-accent-foreground">{user.name}</p>
									<p className="text-xs text-sidebar-foreground/50 truncate group-hover:text-sidebar-accent-foreground/70">{user.email}</p>
								</div>
								<ChevronDown className="w-4 h-4 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/50 transition-colors" />
							</button>
						} />
						<DropdownMenuContent align="end" side="right" className="w-56 mb-2">
							<DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS)}>
								<User className="w-4 h-4 mr-2" />
								Personal Settings
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem variant="destructive" onClick={signOut}>
								<LogOut className="w-4 h-4 mr-2" />
								Sign Out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>
		</div>
	);
}
