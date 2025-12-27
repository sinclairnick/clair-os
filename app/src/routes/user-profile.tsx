import { useParams, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	ArrowLeft,
	Loader2,
	CheckSquare,
	CookingPot,
	Calendar as CalendarIcon,
	Clock,
} from "lucide-react";
import { useCurrentFamilyId, useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { formatDistanceToNow } from "date-fns";

export function UserProfilePage() {
	const { userId } = useParams<{ userId: string }>();
	const familyId = useCurrentFamilyId();
	const { currentFamily } = useAuth();
	const queryClient = useQueryClient();

	const { data: profile, isLoading, error } = useQuery({
		queryKey: ["member-profile", familyId, userId],
		queryFn: () => api.families.getMemberProfile(familyId!, userId!),
		enabled: !!familyId && !!userId,
	});

	const updateMemberMutation = useMutation({
		mutationFn: ({ role }: { role: string }) =>
			api.families.updateMember(familyId!, userId!, { role }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["member-profile", familyId, userId] });
			queryClient.invalidateQueries({ queryKey: ["family-members", familyId] });
		},
	});

	const isAdmin = currentFamily?.role === "admin";

	if (!familyId || !userId) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Invalid request</p>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error || !profile) {
		return (
			<div className="flex flex-col items-center justify-center h-64 gap-4">
				<p className="text-muted-foreground">Could not load profile</p>
				<Link to={ROUTES.FAMILY_MANAGE}>
					<Button variant="outline">
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Family
					</Button>
				</Link>
			</div>
		);
	}

	const { member, tasks, recipes, upcomingEvents } = profile;

	return (
		<div className="space-y-6">
			{/* Back Button + Header */}
			<div className="flex items-start gap-4">
				<Link to={ROUTES.FAMILY_MANAGE}>
					<Button variant="ghost" size="icon" className="shrink-0 mt-1">
						<ArrowLeft className="w-5 h-5" />
					</Button>
				</Link>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-4">
						{member.image ? (
							<img
								src={member.image}
								alt={member.name}
								className="w-16 h-16 rounded-full ring-4 ring-background"
							/>
						) : (
							<div
								className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white ring-4 ring-background"
								style={{ backgroundColor: member.color }}
							>
								{member.name.charAt(0).toUpperCase()}
							</div>
						)}
						<div className="flex-1 min-w-0">
							<h1 className="text-2xl font-bold text-foreground truncate">
								{member.displayName}
							</h1>
							<p className="text-muted-foreground truncate">{member.email}</p>
							<div className="flex items-center gap-2 mt-1">
								{isAdmin ? (
									<Select
										value={member.role}
										onValueChange={(role) => updateMemberMutation.mutate({ role })}
									>
										<SelectTrigger className="w-28 h-7 text-xs">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="admin">Admin</SelectItem>
											<SelectItem value="member">Member</SelectItem>
											<SelectItem value="child">Child</SelectItem>
										</SelectContent>
									</Select>
								) : (
									<Badge variant="secondary" className="capitalize">
										{member.role}
									</Badge>
								)}
								<span className="text-xs text-muted-foreground">
									Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Activity Sections */}
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{/* Tasks */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<CheckSquare className="w-4 h-4 text-primary" />
							Assigned Tasks
						</CardTitle>
						<CardDescription>
							{tasks.length} task{tasks.length !== 1 ? "s" : ""} assigned
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{tasks.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-4">
								No tasks assigned
							</p>
						) : (
							tasks.slice(0, 5).map((task) => (
								<div
									key={task.id}
									className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30"
								>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">{task.title}</p>
										<div className="flex items-center gap-2 text-xs text-muted-foreground">
											<Badge variant="outline" className="text-[10px] capitalize">
												{task.status.replace('_', ' ')}
											</Badge>
											{task.dueDate && (
												<span className="flex items-center gap-1">
													<Clock className="w-3 h-3" />
													{new Date(task.dueDate).toLocaleDateString()}
												</span>
											)}
										</div>
									</div>
								</div>
							))
						)}
						{tasks.length > 5 && (
							<Link to={ROUTES.TASKS} className="block">
								<Button variant="ghost" size="sm" className="w-full text-xs">
									View all {tasks.length} tasks
								</Button>
							</Link>
						)}
					</CardContent>
				</Card>

				{/* Recipes */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<CookingPot className="w-4 h-4 text-primary" />
							Created Recipes
						</CardTitle>
						<CardDescription>
							{recipes.length} recipe{recipes.length !== 1 ? "s" : ""} created
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{recipes.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-4">
								No recipes created
							</p>
						) : (
							recipes.slice(0, 5).map((recipe) => (
								<Link
									key={recipe.id}
									to={ROUTES.RECIPE_DETAIL(recipe.id)}
									className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
								>
									{recipe.imageUrl ? (
										<img
											src={recipe.imageUrl}
											alt={recipe.title}
											className="w-10 h-10 rounded object-cover"
										/>
									) : (
										<div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
											<CookingPot className="w-5 h-5 text-primary" />
										</div>
									)}
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">{recipe.title}</p>
										<p className="text-xs text-muted-foreground">
											{recipe.ingredients?.length || 0} ingredients
										</p>
									</div>
								</Link>
							))
						)}
						{recipes.length > 5 && (
							<Link to={ROUTES.RECIPES} className="block">
								<Button variant="ghost" size="sm" className="w-full text-xs">
									View all {recipes.length} recipes
								</Button>
							</Link>
						)}
					</CardContent>
				</Card>

				{/* Upcoming Events */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<CalendarIcon className="w-4 h-4 text-primary" />
							Upcoming Events
						</CardTitle>
						<CardDescription>
							{upcomingEvents.length} upcoming event{upcomingEvents.length !== 1 ? "s" : ""}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{upcomingEvents.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-4">
								No upcoming events
							</p>
						) : (
							upcomingEvents.slice(0, 5).map((event) => (
								<div
									key={event.id}
									className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30"
								>
									<div
										className="w-2 h-2 rounded-full"
										style={{ backgroundColor: event.color || '#d4a574' }}
									/>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">{event.title}</p>
										<p className="text-xs text-muted-foreground">
											{new Date(event.startTime).toLocaleDateString()} at{" "}
											{new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
										</p>
									</div>
								</div>
							))
						)}
						{upcomingEvents.length > 5 && (
							<Link to={ROUTES.CALENDAR} className="block">
								<Button variant="ghost" size="sm" className="w-full text-xs">
									View all events
								</Button>
							</Link>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
