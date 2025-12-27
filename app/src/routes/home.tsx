import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CookingPot, ShoppingCart, CheckSquare, Calendar, Clock, Play, Pause, RotateCcw, ExternalLink } from "lucide-react";
import { Link } from "react-router";
import { useTimerStore } from "@/lib/timer-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LiveTimerText, LiveTimerProgress } from "@/components/timer/live-timer";

const quickLinks = [
	{
		to: "/recipes",
		label: "Recipes",
		description: "Browse and manage your family recipes",
		icon: CookingPot,
		color: "text-orange-600 dark:text-orange-400",
	},
	{
		to: "/shopping",
		label: "Shopping",
		description: "Create and manage shopping lists",
		icon: ShoppingCart,
		color: "text-green-600 dark:text-green-400",
	},
	{
		to: "/tasks",
		label: "Tasks",
		description: "Track chores and to-dos",
		icon: CheckSquare,
		color: "text-blue-600 dark:text-blue-400",
	},
	{
		to: "/calendar",
		label: "Calendar",
		description: "View your family schedule",
		icon: Calendar,
		color: "text-amber-600 dark:text-amber-400",
	},
];

export function HomePage() {
	const { timers, startTimer, pauseTimer, resetTimer } = useTimerStore();
	const activeTimers = Object.values(timers);

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-foreground">Welcome to ClairOS</h1>
				<p className="text-muted-foreground mt-2">
					Your family's home operations center
				</p>
			</div>

			{/* Active Timers - Highly visible for mobile */}
			{activeTimers.length > 0 && (
				<div className="space-y-4">
					<div className="flex items-center gap-2">
						<Clock className="w-5 h-5 text-primary" />
						<h2 className="text-xl font-semibold">Active Timers</h2>
					</div>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{activeTimers.map((timer) => (
							<Card key={timer.id} className={cn(
								"relative overflow-hidden border-2",
								timer.status === 'completed' ? "border-primary bg-primary/5 animate-pulse" : "border-muted"
							)}>
								<CardContent className="pt-6">
									<div className="flex justify-between items-start mb-4">
										<div className="space-y-1">
											{timer.recipeId ? (
												<Link
													to={`/recipes/${timer.recipeId}`}
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
				</div>
			)}

			{/* Quick Links Grid */}
			<div className="grid gap-4 sm:grid-cols-2">
				{quickLinks.map((item) => (
					<Link key={item.to} to={item.to}>
						<Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
							<CardHeader className="pb-2">
								<div className="flex items-center gap-3">
									<div className={`p-2 rounded-lg bg-muted ${item.color}`}>
										<item.icon className="w-5 h-5" />
									</div>
									<CardTitle className="text-lg group-hover:text-primary transition-colors">
										{item.label}
									</CardTitle>
								</div>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">{item.description}</p>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>

			{/* Placeholder for upcoming items */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Coming Up</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						Your upcoming meals, tasks, and events will appear here.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
