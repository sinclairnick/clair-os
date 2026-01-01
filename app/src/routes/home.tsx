import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CookingPot, ShoppingCart, CheckSquare, Clock, Play, Pause, RotateCcw, X, Bell, Receipt, ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { useTimerStore, getLiveRemainingMs } from "@/lib/timer-store";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { useState, useEffect } from "react";
import { PageTitle } from "@/components/page-title";
import { useAuth, useCurrentFamilyId } from "@/components/auth-provider";
import { dashboardSummaryQuery } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PageHeaderHeading, PageHeaderActions } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export function HomePage() {
	const { user } = useAuth();
	const familyId = useCurrentFamilyId();
	const { timers, removeTimer, startTimer, pauseTimer, resetTimer } = useTimerStore();
	const [activeTimers, setActiveTimers] = useState<string[]>([]);
	const [, setTick] = useState(0);

	const { data: summary, isLoading } = useQuery({
		...dashboardSummaryQuery(familyId || ""),
		enabled: !!familyId,
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

	const getTimeOfDay = () => {
		const hour = new Date().getHours();
		if (hour < 12) return "morning";
		if (hour < 18) return "afternoon";
		return "evening";
	};

	return (
		<div className="space-y-6 pb-20">
			<PageTitle title="Dashboard" />

			<PageHeader>
				<PageHeaderHeading
					title={`Good ${getTimeOfDay()}, ${user?.name?.split(' ')[0]}`}
					description="Here's what's happening today."
				/>
				<PageHeaderActions>
					<Link to={ROUTES.RECIPE_NEW} className="w-full md:w-auto">
						<Button className="w-full">
							<CookingPot className="w-4 h-4 mr-2" />
							New Recipe
						</Button>
					</Link>
				</PageHeaderActions>
			</PageHeader>

			{/* Active Timers */}
			{activeTimers.length > 0 && (
				<div className="space-y-4">
					<h2 className="text-xl font-semibold flex items-center gap-2">
						<Clock className="w-5 h-5 text-accent-foreground" />
						Active Timers
					</h2>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{activeTimers.map(id => {
							const timer = timers[id];
							const remaining = getLiveRemainingMs(timer);
							const seconds = Math.floor((remaining / 1000) % 60);
							const minutes = Math.floor((remaining / 1000 / 60) % 60);
							const hours = Math.floor(remaining / 1000 / 60 / 60);

							return (
								<Card key={id} className="relative overflow-hidden group">
									<div
										className="absolute bottom-0 left-0 h-1 bg-accent-foreground/20 transition-all duration-1000"
										style={{ width: `${(remaining / timer.durationMs) * 100}%` }}
									/>
									<CardHeader className="pb-2">
										<div className="flex justify-between items-start">
											<CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
												{timer.label || "Timer"}
											</CardTitle>
											<button
												onClick={() => removeTimer(id)}
												className="text-muted-foreground hover:text-destructive transition-colors"
											>
												<X className="w-4 h-4" />
											</button>
										</div>
									</CardHeader>
									<CardContent>
										<div className="flex flex-col items-center gap-4">
											<div className="text-3xl font-mono font-bold tabular-nums">
												{hours > 0 && `${hours}:`}{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
											</div>
											<div className="flex gap-2">
												{timer.status === 'running' ? (
													<Button
														size="sm"
														variant="outline"
														onClick={() => pauseTimer(id)}
													>
														<Pause className="w-4 h-4" />
													</Button>
												) : (
													<Button
														size="sm"
														variant="outline"
														onClick={() => startTimer(id)}
													>
														<Play className="w-4 h-4" />
													</Button>
												)}
												<Button
													size="sm"
													variant="outline"
													onClick={() => resetTimer(id)}
												>
													<RotateCcw className="w-4 h-4" />
												</Button>
											</div>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				</div>
			)}

			{/* Summary Widgets */}
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{/* Recent Recipes */}
				<Card className="flex flex-col">
					<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
						<CardTitle className="text-base font-semibold">Latest Recipes</CardTitle>
						<CookingPot className="w-4 h-4 text-muted-foreground" />
					</CardHeader>
					<CardContent className="flex-1">
						{isLoading ? (
							<div className="space-y-2">
								{[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />)}
							</div>
						) : summary?.recentRecipes?.length ? (
							<div className="space-y-3">
								{summary.recentRecipes.map((recipe: any) => (
									<Link
										key={recipe.id}
										to={ROUTES.RECIPE_DETAIL(recipe.id)}
										className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
									>
										<div className="w-10 h-10 rounded bg-accent/10 flex items-center justify-center shrink-0">
											<CookingPot className="w-5 h-5 text-accent-foreground" />
										</div>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{recipe.title}</p>
											<p className="text-xs text-muted-foreground">Added {formatDistanceToNow(new Date(recipe.createdAt))} ago</p>
										</div>
										<ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
									</Link>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground py-4 text-center">No recipes yet.</p>
						)}
					</CardContent>
					<div className="p-4 pt-0">
						<Link to={ROUTES.RECIPES}>
							<Button variant="ghost" size="sm" className="w-full text-xs">View All Recipes</Button>
						</Link>
					</div>
				</Card>

				{/* Upcoming Tasks */}
				<Card className="flex flex-col">
					<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
						<CardTitle className="text-base font-semibold">Need to Do</CardTitle>
						<CheckSquare className="w-4 h-4 text-muted-foreground" />
					</CardHeader>
					<CardContent className="flex-1">
						{isLoading ? (
							<div className="space-y-2">
								{[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />)}
							</div>
						) : summary?.outstandingTasks?.length ? (
							<div className="space-y-3">
								{summary.outstandingTasks.map((task: any) => (
									<div key={task.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/20">
										<div className={cn(
											"w-2 h-2 rounded-full shrink-0",
											task.priority === 'high' ? "bg-destructive" : task.priority === 'medium' ? "bg-accent-foreground" : "bg-muted-foreground"
										)} />
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium truncate">{task.title}</p>
											{task.dueDate && (
												<p className={cn(
													"text-xs",
													isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) ? "text-destructive font-medium" : "text-muted-foreground"
												)}>
													Due {isToday(new Date(task.dueDate)) ? "today" : format(new Date(task.dueDate), "MMM d")}
												</p>
											)}
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground py-4 text-center">Clean slate! No tasks due.</p>
						)}
					</CardContent>
					<div className="p-4 pt-0">
						<Link to={ROUTES.TASKS}>
							<Button variant="ghost" size="sm" className="w-full text-xs">Manage Tasks</Button>
						</Link>
					</div>
				</Card>

				{/* Shopping Lists */}
				<Card className="flex flex-col">
					<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
						<CardTitle className="text-base font-semibold">Shopping</CardTitle>
						<ShoppingCart className="w-4 h-4 text-muted-foreground" />
					</CardHeader>
					<CardContent className="flex-1">
						{isLoading ? (
							<div className="space-y-4">
								{[1, 2].map(i => (
									<div key={i} className="space-y-2">
										<div className="h-4 w-24 bg-muted animate-pulse rounded" />
										<div className="h-8 bg-muted animate-pulse rounded" />
									</div>
								))}
							</div>
						) : summary?.activeShoppingLists?.length ? (
							<div className="space-y-4">
								{summary.activeShoppingLists.map((list: any) => (
									<div key={list.id} className="space-y-2">
										<div className="flex justify-between items-center">
											<p className="text-xs font-semibold text-muted-foreground uppercase">{list.name}</p>
											<span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground font-medium">
												{list.items.filter((i: any) => i.checked).length}/{list.items.length}
											</span>
										</div>
										<div className="flex flex-wrap gap-1.5">
											{list.items.filter((i: any) => !i.checked).slice(0, 5).map((item: any, i: number) => (
												<Badge key={i} variant="outline" className="text-[10px] font-normal py-0">
													{item.name}
												</Badge>
											))}
											{list.items.filter((i: any) => !i.checked).length > 5 && (
												<span className="text-[10px] text-muted-foreground flex items-center">+{list.items.filter((i: any) => !i.checked).length - 5} more</span>
											)}
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground py-4 text-center">Nothing to buy.</p>
						)}
					</CardContent>
					<div className="p-4 pt-0">
						<Link to={ROUTES.SHOPPING}>
							<Button variant="ghost" size="sm" className="w-full text-xs">View Lists</Button>
						</Link>
					</div>
				</Card>

				{/* Upcoming Bills */}
				<Card className="flex flex-col">
					<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
						<CardTitle className="text-base font-semibold">Bills</CardTitle>
						<Receipt className="w-4 h-4 text-muted-foreground" />
					</CardHeader>
					<CardContent className="flex-1">
						{isLoading ? (
							<div className="space-y-2">
								{[1, 2].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />)}
							</div>
						) : summary?.upcomingBills?.length ? (
							<div className="space-y-3">
								{summary.upcomingBills.map((bill: any) => (
									<div key={bill.id} className="flex items-center justify-between p-2 rounded-lg border bg-card">
										<div className="min-w-0">
											<p className="text-sm font-medium truncate">{bill.name}</p>
											<p className="text-xs text-muted-foreground">Due {format(new Date(bill.dueDate), "MMM d")}</p>
										</div>
										<div className="text-right">
											<p className="text-sm font-bold text-foreground">${bill.amount.toFixed(2)}</p>
											<p className="text-[10px] text-muted-foreground uppercase">{bill.frequency}</p>
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground py-4 text-center">No upcoming bills.</p>
						)}
					</CardContent>
					<div className="p-4 pt-0">
						<Link to={ROUTES.BILLS}>
							<Button variant="ghost" size="sm" className="w-full text-xs">Manage Expenses</Button>
						</Link>
					</div>
				</Card>

				{/* Important Reminders */}
				<Card className="flex flex-col">
					<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
						<CardTitle className="text-base font-semibold">Reminders</CardTitle>
						<Bell className="w-4 h-4 text-muted-foreground" />
					</CardHeader>
					<CardContent className="flex-1">
						{isLoading ? (
							<div className="space-y-2">
								{[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />)}
							</div>
						) : summary?.upcomingReminders?.length ? (
							<div className="space-y-3">
								{summary.upcomingReminders.map((reminder: any) => (
									<div key={reminder.id} className="flex items-start gap-2 p-2 rounded-lg bg-accent/10">
										<Bell className="w-3.5 h-3.5 mt-0.5 text-accent-foreground shrink-0" />
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium truncate">{reminder.title}</p>
											<p className="text-xs text-muted-foreground">{format(new Date(reminder.remindAt), "h:mm a")}</p>
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground py-4 text-center">No active reminders.</p>
						)}
					</CardContent>
					<div className="p-4 pt-0">
						<Link to={ROUTES.REMINDERS}>
							<Button variant="ghost" size="sm" className="w-full text-xs">See All Reminders</Button>
						</Link>
					</div>
				</Card>
			</div>
		</div>
	);
}
