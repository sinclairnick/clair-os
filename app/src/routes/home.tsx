import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CookingPot, ShoppingCart, CheckSquare, Calendar, Clock, Play, Pause, RotateCcw, ExternalLink, X, Bell, Receipt, ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { useTimerStore } from "@/lib/timer-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LiveTimerText, LiveTimerProgress } from "@/components/timer/live-timer";
import { ROUTES } from "@/lib/routes";
import { PageTitle } from "@/components/page-title";
import { useAuth, useCurrentFamilyId } from "@/components/auth-provider";
import { dashboardSummaryQuery } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { Badge } from "@/components/ui/badge";

export function HomePage() {
	const { user } = useAuth();
	const familyId = useCurrentFamilyId();

	const { data: dashboard, isLoading } = useQuery(dashboardSummaryQuery(familyId || "", { enabled: !!familyId }));
	const { timers, startTimer, pauseTimer, resetTimer, removeTimer } = useTimerStore();
	const activeTimers = Object.values(timers).filter(timer => timer.status !== 'idle');

	if (!familyId) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Please select a family first</p>
			</div>
		);
	}

	if (isLoading) {
		return <div className="p-8 text-center">Loading dashboard...</div>;
	}

	return (
		<div className="space-y-6 pb-20">
			<PageTitle title="Dashboard" />

			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-foreground">Good {getTimeOfDay()}, {user?.name?.split(' ')[0]}</h1>
					<p className="text-muted-foreground mt-1">Here's what's happening today.</p>
				</div>
				<Link to={ROUTES.RECIPE_NEW}>
					<Button>
						<CookingPot className="w-4 h-4 mr-2" />
						New Recipe
					</Button>
				</Link>
			</div>

			{/* Active Timers */}
			{activeTimers.length > 0 && (
				<section>
					<div className="flex items-center gap-2 mb-3 text-muted-foreground">
						<Clock className="w-4 h-4" />
						<h2 className="text-sm font-semibold uppercase tracking-wider">Active Timers</h2>
					</div>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{activeTimers.map((timer) => (
							<Card key={timer.id} className={cn(
								"relative overflow-hidden border-2",
								timer.status === 'completed' ? "border-primary bg-primary/5 animate-pulse" : "border-muted"
							)}>
								<Button
									variant="ghost"
									size="icon"
									className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive transition-colors z-10"
									onClick={() => removeTimer(timer.id)}
								>
									<X className="w-4 h-4" />
								</Button>
								<CardContent className="pt-6">
									<div className="flex justify-between items-start mb-4">
										<div className="space-y-1">
											{timer.recipeId ? (
												<Link
													to={ROUTES.RECIPE_DETAIL(timer.recipeId)}
													className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-bold hover:bg-primary/20 transition-colors group/link"
												>
													{timer.label}
													<ExternalLink className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
												</Link>
											) : (
												<p className="text-sm font-medium">{timer.label}</p>
											)}
											<p className="text-xs text-muted-foreground uppercase tracking-wider">{timer.status}</p>
										</div>
										<span className={cn(
											"text-3xl font-mono font-bold tracking-tight",
											timer.status === 'completed' ? "text-primary text-4xl" : "text-foreground"
										)}>
											<LiveTimerText timer={timer} />
										</span>
									</div>

									<div className="flex gap-2">
										<Button
											variant={timer.status === 'running' ? "outline" : "default"}
											size="sm"
											className="flex-1"
											onClick={() => timer.status === 'running' ? pauseTimer(timer.id) : startTimer(timer.id)}
										>
											{timer.status === 'running' ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
											{timer.status === 'running' ? 'Pause' : 'Start'}
										</Button>
										<Button
											variant="secondary"
											size="sm"
											onClick={() => resetTimer(timer.id)}
										>
											<RotateCcw className="w-4 h-4" />
										</Button>
									</div>
								</CardContent>
								{timer.status === 'running' && (
									<LiveTimerProgress
										timer={timer}
										className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-[50ms] linear"
									/>
								)}
							</Card>
						))}
					</div>
				</section>
			)}

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

				{/* Recent Recipes */}
				<Card className="h-full flex flex-col">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="p-2 rounded-md bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
									<CookingPot className="w-4 h-4" />
								</div>
								<CardTitle className="text-base">Recent Recipes</CardTitle>
							</div>
							<Link to={ROUTES.RECIPES} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
								View All <ArrowRight className="w-3 h-3" />
							</Link>
						</div>
					</CardHeader>
					<CardContent className="flex-1">
						{dashboard?.recentRecipes && dashboard.recentRecipes.length > 0 ? (
							<div className="space-y-3">
								{dashboard.recentRecipes.map(recipe => (
									<Link key={recipe.id} to={ROUTES.RECIPE_DETAIL(recipe.id)} className="flex items-center gap-3 group">
										<div className="h-10 w-10 rounded-md bg-muted overflow-hidden flex-shrink-0">
											{recipe.imageUrl ? (
												<img src={recipe.imageUrl} alt={recipe.title} className="h-full w-full object-cover group-hover:scale-110 transition-transform" />
											) : (
												<div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-muted-foreground">
													<CookingPot className="w-5 h-5 opacity-20" />
												</div>
											)}
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{recipe.title}</p>
											<p className="text-xs text-muted-foreground truncate">
												{recipe.tags.slice(0, 2).join(', ')}
											</p>
										</div>
									</Link>
								))}
							</div>
						) : (
							<div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground space-y-2">
								<CookingPot className="w-8 h-8 opacity-20" />
								<p className="text-sm">No recipes yet</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Tasks */}
				<Card className="h-full flex flex-col">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
									<CheckSquare className="w-4 h-4" />
								</div>
								<CardTitle className="text-base">Outstanding Tasks</CardTitle>
							</div>
							<Link to={ROUTES.TASKS} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
								View All <ArrowRight className="w-3 h-3" />
							</Link>
						</div>
					</CardHeader>
					<CardContent className="flex-1">
						{dashboard?.outstandingTasks && dashboard.outstandingTasks.length > 0 ? (
							<div className="space-y-3">
								{dashboard.outstandingTasks.map(task => (
									<div key={task.id} className="flex items-start gap-2.5">
										<div className={cn(
											"mt-1 h-2 w-2 rounded-full flex-shrink-0",
											task.priority === 'high' ? "bg-red-500" :
												task.priority === 'medium' ? "bg-yellow-500" : "bg-blue-500"
										)} />
										<div className="flex-1 space-y-0.5">
											<p className="text-sm font-medium leading-none">{task.title}</p>
											<div className="flex items-center gap-2 text-xs text-muted-foreground">
												{task.dueDate && (
													<span className={isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) ? "text-destructive font-medium" : ""}>
														{format(new Date(task.dueDate), "MMM d")}
													</span>
												)}
												{task.assignee && (
													<span>• {task.assignee.name.split(' ')[0]}</span>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground space-y-2">
								<CheckSquare className="w-8 h-8 opacity-20" />
								<p className="text-sm">All caught up!</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Shopping Lists */}
				<Card className="h-full flex flex-col">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="p-2 rounded-md bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
									<ShoppingCart className="w-4 h-4" />
								</div>
								<CardTitle className="text-base">Shopping Lists</CardTitle>
							</div>
							<Link to={ROUTES.SHOPPING} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
								View All <ArrowRight className="w-3 h-3" />
							</Link>
						</div>
					</CardHeader>
					<CardContent className="flex-1">
						{dashboard?.activeShoppingLists && dashboard.activeShoppingLists.length > 0 ? (
							<div className="space-y-3">
								{dashboard.activeShoppingLists.map(list => (
									<Link key={list.id} to={`/shopping?list=${list.id}`}>
										<div className="rounded-lg border p-3 hover:bg-muted/50 transition-colors">
											<div className="flex justify-between items-center mb-1.5">
												<h4 className="font-medium text-sm">{list.name}</h4>
												<Badge variant="secondary" className="text-[10px] h-5 px-1.5">
													{list.items.filter(i => !i.checked).length} items
												</Badge>
											</div>
											<div className="text-xs text-muted-foreground truncate">
												{list.items.length > 0 ? (
													list.items.slice(0, 3).map(i => i.name).join(', ') + (list.items.length > 3 ? '...' : '')
												) : (
													"Empty list"
												)}
											</div>
										</div>
									</Link>
								))}
							</div>
						) : (
							<div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground space-y-2">
								<ShoppingCart className="w-8 h-8 opacity-20" />
								<p className="text-sm">No active lists</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Bills & Reminders Combined or Separate? Layout asked for separate but space might be tight. */}
				{/* Let's do Bills */}
				<Card className="h-full flex flex-col">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="p-2 rounded-md bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400">
									<Receipt className="w-4 h-4" />
								</div>
								<CardTitle className="text-base">Upcoming Bills</CardTitle>
							</div>
							<Link to={ROUTES.BILLS} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
								View All <ArrowRight className="w-3 h-3" />
							</Link>
						</div>
					</CardHeader>
					<CardContent className="flex-1">
						{dashboard?.upcomingBills && dashboard.upcomingBills.length > 0 ? (
							<div className="space-y-3">
								{dashboard.upcomingBills.map(bill => (
									<div key={bill.id} className="flex items-center justify-between group">
										<div className="min-w-0">
											<p className="text-sm font-medium truncate">{bill.name}</p>
											<p className={cn(
												"text-xs truncate",
												isPast(new Date(bill.dueDate)) && !isToday(new Date(bill.dueDate))
													? "text-destructive font-medium"
													: "text-muted-foreground"
											)}>
												Due {formatDistanceToNow(new Date(bill.dueDate), { addSuffix: true })}
											</p>
										</div>
										<div className="font-mono text-sm font-medium">
											${bill.amount.toFixed(2)}
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground space-y-2">
								<Receipt className="w-8 h-8 opacity-20" />
								<p className="text-sm">No upcoming bills</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Reminders */}
				<Card className="h-full flex flex-col md:col-span-2 lg:col-span-2">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
									<Bell className="w-4 h-4" />
								</div>
								<CardTitle className="text-base">Reminders</CardTitle>
							</div>
							<Link to={ROUTES.REMINDERS} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
								View All <ArrowRight className="w-3 h-3" />
							</Link>
						</div>
					</CardHeader>
					<CardContent className="flex-1">
						{dashboard?.upcomingReminders && dashboard.upcomingReminders.length > 0 ? (
							<div className="grid sm:grid-cols-2 gap-4">
								{dashboard.upcomingReminders.map(reminder => (
									<div key={reminder.id} className="flex gap-3 bg-muted/40 p-3 rounded-lg border">
										<div className="flex flex-col items-center justify-center p-2 bg-background border rounded-md h-12 w-12 text-center shadow-sm">
											<span className="text-[10px] uppercase text-muted-foreground font-bold">
												{format(new Date(reminder.remindAt), 'MMM')}
											</span>
											<span className="text-lg font-bold leading-none">
												{format(new Date(reminder.remindAt), 'd')}
											</span>
										</div>
										<div className="flex-1 min-w-0 flex flex-col justify-center">
											<p className="text-sm font-medium truncate">{reminder.title}</p>
											<div className="flex items-center gap-2 text-xs text-muted-foreground">
												<Clock className="w-3 h-3" />
												{format(new Date(reminder.remindAt), 'h:mm a')}
												{reminder.assignees.length > 0 && (
													<span>• for {reminder.assignees[0].user.name.split(' ')[0]}</span>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground space-y-2">
								<Bell className="w-8 h-8 opacity-20" />
								<p className="text-sm">No upcoming reminders</p>
							</div>
						)}
					</CardContent>
				</Card>

			</div>
		</div>
	);
}

function getTimeOfDay() {
	const hour = new Date().getHours();
	if (hour < 12) return "Morning";
	if (hour < 18) return "Afternoon";
	return "Evening";
}
