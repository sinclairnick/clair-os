
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CookingPot, Clock, Play, Pause, RotateCcw, X, Bell, Award, CalendarDays, ChevronRight, Plus, CheckCircle, Receipt, ShoppingCart, CheckSquare } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useTimerStore, getLiveRemainingMs } from "@/lib/timer-store";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { useState, useEffect } from "react";
import { PageTitle } from "@/components/page-title";
import { useAuth, useCurrentFamilyId } from "@/components/auth-provider";
import { dashboardSummaryQuery, queryKeys } from "@/lib/queries";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { PageHeader, PageHeaderHeading, PageHeaderActions } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ShoppingListCard } from "@/components/shopping-list-card";
import { api, type RecipeResponse } from "@/lib/api";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecipeCard } from "@/components/recipe-card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateShoppingListDialog } from "@/components/create-shopping-list-dialog";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { CreateReminderDialog } from "@/components/create-reminder-dialog";

export function HomePage() {
	const { user } = useAuth();
	const familyId = useCurrentFamilyId();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { timers, removeTimer, startTimer, pauseTimer, resetTimer } = useTimerStore();
	const [activeTimers, setActiveTimers] = useState<string[]>([]);
	const [, setTick] = useState(0);

	// Persisted selection for recipe tabs
	const [recipeTab, setRecipeTab] = useState(() => localStorage.getItem("clairos_dashboard_recipe_tab") || "recent");

	// Dialog states
	const [createListOpen, setCreateListOpen] = useState(false);
	const [createTaskOpen, setCreateTaskOpen] = useState(false);
	const [createReminderOpen, setCreateReminderOpen] = useState(false);

	const { data: summary, isLoading } = useQuery({
		...dashboardSummaryQuery(familyId || ""),
		enabled: !!familyId,
	});

	const toggleFavoriteMutation = useMutation({
		mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
			api.recipes.toggleFavorite(id, favorite),
		onSuccess: () => {
			if (familyId) {
				queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary(familyId) });
			}
		},
		onError: () => {
			toast.error("Failed to update favorite status");
		}
	});

	useEffect(() => {
		const interval = setInterval(() => {
			const active = Object.keys(timers).filter(id => {
				const timer = timers[id];
				const remaining = getLiveRemainingMs(timer);
				return remaining > 0 || timer.status === 'running';
			});
			setActiveTimers(active);
			setTick(t => t + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [timers]);

	const handleRecipeTabChange = (value: string) => {
		setRecipeTab(value);
		localStorage.setItem("clairos_dashboard_recipe_tab", value);
	};

	const getTimeOfDay = () => {
		const hour = new Date().getHours();
		if (hour < 12) return "morning";
		if (hour < 18) return "afternoon";
		return "evening";
	};

	return (
		<div className="space-y-8 pb-20">
			<PageTitle title="Dashboard" />

			<PageHeader>
				<PageHeaderHeading
					title={`Good ${getTimeOfDay()}, ${user?.name?.split(' ')[0]}`}
					description="Welcome home."
				/>
				<PageHeaderActions>
					<DropdownMenu>
						<DropdownMenuTrigger render={
							<Button size="sm">
								<Plus className="w-4 h-4 mr-2" />
								Create New
							</Button>
						}>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							<DropdownMenuItem onClick={() => setCreateListOpen(true)}>
								<ShoppingCart className="w-4 h-4 mr-2" />
								Shopping List
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => navigate(ROUTES.RECIPE_NEW)}>
								<CookingPot className="w-4 h-4 mr-2" />
								Recipe
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setCreateReminderOpen(true)}>
								<Bell className="w-4 h-4 mr-2" />
								Reminder
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setCreateTaskOpen(true)}>
								<CheckSquare className="w-4 h-4 mr-2" />
								Task
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</PageHeaderActions>
			</PageHeader>

			<CreateShoppingListDialog open={createListOpen} onOpenChange={setCreateListOpen} defaultPinned={true} />
			<CreateTaskDialog open={createTaskOpen} onOpenChange={setCreateTaskOpen} />
			<CreateReminderDialog open={createReminderOpen} onOpenChange={setCreateReminderOpen} />

			{/* Active Timers */}
			{activeTimers.length > 0 && (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{activeTimers.map(id => {
						const timer = timers[id];
						const remaining = getLiveRemainingMs(timer);
						const seconds = Math.floor((remaining / 1000) % 60);
						const minutes = Math.floor((remaining / 1000 / 60) % 60);
						const hours = Math.floor(remaining / 1000 / 60 / 60);

						return (
							<Card key={id} className="relative overflow-hidden bg-primary/5 border-primary/20">
								<div
									className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-1000"
									style={{ width: `${(remaining / timer.durationMs) * 100}%` }}
								/>
								<CardHeader className="pb-1 pt-3 px-4 flex flex-row items-center justify-between space-y-0">
									<CardTitle className="text-xs font-semibold text-primary flex items-center gap-2">
										<Clock className="w-3 h-3" />
										{timer.label || "Timer"}
									</CardTitle>
									<button onClick={() => removeTimer(id)} className="text-muted-foreground hover:text-destructive">
										<X className="w-3 h-3" />
									</button>
								</CardHeader>
								<CardContent className="px-4 pb-3">
									<div className="flex items-center justify-between">
										<div className="text-xl font-mono font-bold tabular-nums">
											{hours > 0 && `${hours}:`}{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
										</div>
										<div className="flex gap-1">
											{timer.status === 'running' ? (
												<Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => pauseTimer(id)}>
													<Pause className="w-3.5 h-3.5" />
												</Button>
											) : (
												<Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startTimer(id)}>
													<Play className="w-3.5 h-3.5" />
												</Button>
											)}
											<Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => resetTimer(id)}>
												<RotateCcw className="w-3.5 h-3.5" />
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			{/* Row 1: Pinned Lists + Activity */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
				{/* Pinned Shopping Lists */}
				<div className="lg:col-span-8 space-y-4 min-w-0">
					<div className="flex items-center justify-between px-1">
						<h3 className="text-lg font-bold tracking-tight">Shopping Lists</h3>
						<Link to={ROUTES.SHOPPING} className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1">
							View all <ChevronRight className="w-3 h-3" />
						</Link>
					</div>

					{isLoading ? (
						<div className="h-64 bg-muted/30 animate-pulse rounded-2xl border border-dashed" />
					) : summary?.pinnedShoppingLists?.length ? (
						<Tabs defaultValue={summary.pinnedShoppingLists[0]?.id} className="w-full">
							<div className="flex items-center pr-2">
								<TabsList variant="dashboard" className="flex-1">
									{summary.pinnedShoppingLists.map(list => (
										<TabsTrigger
											key={list.id}
											value={list.id}
											variant="dashboard"
										>
											{list.name}
										</TabsTrigger>
									))}
								</TabsList>
								<Button
									size="icon"
									variant="ghost"
									className="h-8 w-8 rounded-full mb-2"
									onClick={() => setCreateListOpen(true)}
								>
									<Plus className="w-4 h-4" />
								</Button>
							</div>
							{summary.pinnedShoppingLists.map(list => (
								<TabsContent key={list.id} value={list.id} className="mt-4 focus-visible:ring-0">
									<ShoppingListCard list={list} />
								</TabsContent>
							))}
						</Tabs>
					) : (
						<Card className="border-dashed bg-muted/20 rounded-2xl">
							<CardContent className="flex flex-col items-center justify-center py-12 opacity-50">
								<CalendarDays className="w-10 h-10 mb-2 text-muted-foreground" />
								<p className="text-sm font-semibold">No pinned lists</p>
								<p className="text-xs text-muted-foreground mt-1 max-w-[200px] text-center">Pin a shopping list for instant access here.</p>
							</CardContent>
						</Card>
					)}
				</div>

				{/* Activity Feed Sidebar */}
				<div className="lg:col-span-4 space-y-4">
					<h3 className="text-lg font-bold tracking-tight px-1">Activity</h3>
					<Card className="rounded-2xl overflow-hidden border-muted/50 bg-muted/10 shadow-sm !py-0">
						<div className="h-[430px] overflow-y-auto scrollbar-none">
							<div className="divide-y divide-muted/50">
								{/* Tasks Section */}
								<div className="relative">
									<Link to={ROUTES.TASKS} className="sticky top-0 z-10 bg-background/95 backdrop-blur-md px-4 py-2.5 text-xs font-semibold text-muted-foreground/80 border-b border-muted/30 flex items-center justify-between hover:text-primary transition-colors cursor-pointer">
										<span>To Do</span>
										<ChevronRight className="w-3 h-3" />
									</Link>
									<div className="p-2 space-y-1">
										{isLoading ? (
											[1, 2].map(i => <div key={i} className="h-12 w-full animate-pulse bg-muted rounded-xl" />)
										) : summary?.outstandingTasks.length ? (
											summary.outstandingTasks.map(task => (
												<Link key={task.id} to={ROUTES.TASKS} className="group/item flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-primary/[0.03] transition-all border border-transparent hover:border-primary/5">
													<div className={cn("w-1.5 h-6 rounded-full shrink-0 shadow-sm transition-all group-hover/item:scale-y-110",
														task.priority === 'high' ? "bg-red-500 shadow-red-500/20" : task.priority === 'medium' ? "bg-amber-500 shadow-amber-500/20" : "bg-blue-500 shadow-blue-500/20"
													)} />
													<div className="min-w-0 flex-1">
														<p className="text-xs font-bold truncate group-hover/item:text-primary transition-colors">{task.title}</p>
														<p className="text-xs text-muted-foreground font-semibold mt-0.5 opacity-70">
															{task.dueDate ? format(new Date(task.dueDate), "MMM d") : "Flexible"}
														</p>
													</div>
												</Link>
											))
										) : (
											<div className="py-6 flex flex-col items-center opacity-30">
												<CheckCircle className="w-5 h-5 mb-2" />
												<p className="text-xs font-semibold text-center mt-1">All caught up</p>
											</div>
										)}
									</div>
								</div>

								{/* Reminders Section */}
								<div className="relative">
									<Link to={ROUTES.REMINDERS} className="sticky top-0 z-10 bg-background/95 backdrop-blur-md px-4 py-2.5 text-xs font-semibold text-muted-foreground/80 border-b border-muted/30 flex items-center justify-between hover:text-primary transition-colors cursor-pointer">
										<span>Reminders</span>
										<ChevronRight className="w-3 h-3" />
									</Link>
									<div className="p-2 space-y-1">
										{isLoading ? (
											[1, 2].map(i => <div key={i} className="h-12 w-full animate-pulse bg-muted rounded-xl" />)
										) : summary?.upcomingReminders.length ? (
											summary.upcomingReminders.map(reminder => (
												<div key={reminder.id} className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-primary/[0.03] transition-all border border-transparent hover:border-primary/5">
													<div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
														<Bell className="w-4 h-4 text-primary" />
													</div>
													<div className="min-w-0 flex-1">
														<p className="text-xs font-bold truncate">{reminder.title}</p>
														<p className="text-xs text-muted-foreground font-semibold mt-0.5 opacity-70">
															{format(new Date(reminder.remindAt), "h:mm a, MMM d")}
														</p>
													</div>
												</div>
											))
										) : (
											<div className="py-6 flex flex-col items-center opacity-30">
												<Bell className="w-5 h-5 mb-2" />
												<p className="text-xs font-semibold text-center mt-1">Quiet day</p>
											</div>
										)}
									</div>
								</div>

								{/* Bills Section */}
								<div className="relative">
									<Link to={ROUTES.BILLS} className="sticky top-0 z-10 bg-background/95 backdrop-blur-md px-4 py-2.5 text-xs font-semibold text-muted-foreground/80 border-b border-muted/30 flex items-center justify-between hover:text-primary transition-colors cursor-pointer">
										<span>Bills</span>
										<ChevronRight className="w-3 h-3" />
									</Link>
									<div className="p-2 space-y-1">
										{isLoading ? (
											[1, 2].map(i => <div key={i} className="h-12 w-full animate-pulse bg-muted rounded-xl" />)
										) : summary?.upcomingBills.length ? (
											summary.upcomingBills.map(bill => (
												<Link key={bill.id} to={ROUTES.BILLS} className="group/item flex items-center justify-between gap-4 px-3 py-3 rounded-xl hover:bg-primary/[0.03] transition-all border border-transparent hover:border-primary/5">
													<div className="min-w-0 flex-1">
														<p className="text-xs font-bold truncate group-hover/item:text-primary transition-colors">{bill.name}</p>
														<p className="text-xs text-muted-foreground font-semibold mt-0.5 opacity-70">
															Due {format(new Date(bill.dueDate), "MMM d")}
														</p>
													</div>
													<div className="text-right">
														<p className="text-sm font-bold text-foreground">${bill.amount.toFixed(0)}</p>
													</div>
												</Link>
											))
										) : (
											<div className="py-6 flex flex-col items-center opacity-30">
												<Receipt className="w-5 h-5 mb-2" />
												<p className="text-xs font-semibold text-center mt-1">Paid up</p>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					</Card>
				</div>
			</div>

			{/* Row 2: Recipes Tabs */}
			<div className="space-y-6 pt-4">
				<div className="flex items-center justify-between px-1">
					<h3 className="text-lg font-bold tracking-tight">Recipes</h3>
					<Link to={ROUTES.RECIPES} className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1">
						Browse all <ChevronRight className="w-3 h-3" />
					</Link>
				</div>

				<Tabs value={recipeTab} onValueChange={handleRecipeTabChange} className="w-full">
					<TabsList variant="dashboard">
						<TabsTrigger
							value="recent"
							variant="dashboard"
						>
							Recent
						</TabsTrigger>
						<TabsTrigger
							value="favorites"
							variant="dashboard"
						>
							Favorites
						</TabsTrigger>
						<TabsTrigger
							value="signatures"
							variant="dashboard"
						>
							Signatures
						</TabsTrigger>
					</TabsList>

					<div className="mt-8">
						<TabsContent value="recent" className="m-0 focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
							<RecipeList recipes={summary?.recentRecipes} isLoading={isLoading} toggleFavorite={(id, fav) => toggleFavoriteMutation.mutate({ id, favorite: fav })} />
						</TabsContent>
						<TabsContent value="favorites" className="m-0 focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
							<RecipeList recipes={summary?.favoriteRecipes} isLoading={isLoading} toggleFavorite={(id, fav) => toggleFavoriteMutation.mutate({ id, favorite: fav })} />
						</TabsContent>
						<TabsContent value="signatures" className="m-0 focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
							<RecipeList recipes={summary?.signatureRecipes} isLoading={isLoading} toggleFavorite={(id, fav) => toggleFavoriteMutation.mutate({ id, favorite: fav })} />
						</TabsContent>
					</div>
				</Tabs>
			</div>
		</div>
	);
}

function RecipeList({ recipes, isLoading, toggleFavorite }: { recipes?: RecipeResponse[], isLoading: boolean, toggleFavorite: (id: string, fav: boolean) => void }) {
	if (isLoading) {
		return (
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{[1, 2, 3, 4].map(i => <div key={i} className="h-72 bg-muted/30 animate-pulse rounded-2xl" />)}
			</div>
		);
	}

	if (!recipes?.length) {
		return (
			<div className="flex flex-col items-center justify-center py-24 bg-muted/10 rounded-3xl border border-dashed border-muted-foreground/20 text-muted-foreground/40">
				<div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
					<Award className="w-8 h-8 opacity-20" />
				</div>
				<p className="text-sm font-semibold text-center">No recipes to show</p>
				<p className="text-xs text-center mt-1 opacity-70">Start by adding your first family recipe.</p>
			</div>
		);
	}

	return (
		<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" >
			{
				recipes.map(recipe => (
					<RecipeCard
						key={recipe.id}
						recipe={recipe}
						onFavoriteToggle={toggleFavorite}
					/>
				))
			}
		</div >
	);
}
