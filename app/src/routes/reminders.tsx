
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Bell, BellOff, Clock, ExternalLink, Link2 } from "lucide-react";
import { useCurrentFamilyId } from "@/components/auth-provider";
import { api, type ReminderResponse } from "@/lib/api";
import { format, isPast, isToday } from "date-fns";
import { PageTitle } from "@/components/page-title";
import { PageHeader, PageHeaderHeading, PageHeaderActions } from "@/components/page-header";
import { ROUTES } from "@/lib/routes";
import { Link } from "react-router";
import { CreateReminderDialog } from "@/components/create-reminder-dialog";

export function RemindersPage() {
	const familyId = useCurrentFamilyId();
	const queryClient = useQueryClient();

	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	const { data: reminders, isLoading, error } = useQuery({
		queryKey: ['reminders', familyId],
		queryFn: () => api.reminders.list(familyId || '', { dismissed: 'false' }),
		enabled: !!familyId,
	});

	const dismissMutation = useMutation({
		mutationFn: (id: string) => api.reminders.dismiss(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['reminders', familyId] });
		},
	});

	if (!familyId) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Please select a family first</p>
			</div>
		);
	}

	// Separate user-created from resource-owned reminders
	const userReminders = reminders?.filter(r => r.source === 'user') || [];
	const resourceReminders = reminders?.filter(r => r.source !== 'user') || [];

	return (
		<div className="space-y-6">
			<PageTitle title="Reminders" />
			<PageHeader>
				<PageHeaderHeading title="Reminders" description="Stay on top of important dates and events" />
				<PageHeaderActions>
					<Button onClick={() => setIsCreateDialogOpen(true)}>
						<Plus className="w-4 h-4 mr-2" />
						New Reminder
					</Button>
					<CreateReminderDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
				</PageHeaderActions>
			</PageHeader>

			{isLoading && (
				<div className="flex items-center justify-center h-64">
					<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
				</div>
			)}

			{error && (
				<Card className="border-destructive">
					<CardContent className="pt-6">
						<p className="text-destructive">Failed to load reminders</p>
					</CardContent>
				</Card>
			)}

			{reminders && reminders.length === 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Bell className="w-5 h-5" />
							No active reminders
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							Create reminders to stay on top of important dates.
							Bills and other items can also create reminders automatically.
						</p>
					</CardContent>
				</Card>
			)}

			{/* User-created reminders - emphasized */}
			{userReminders.length > 0 && (
				<div className="space-y-3">
					<h2 className="text-lg font-semibold flex items-center gap-2">
						<Bell className="w-5 h-5" />
						Your Reminders
					</h2>
					{userReminders.map((reminder) => (
						<ReminderCard
							key={reminder.id}
							reminder={reminder}
							onDismiss={() => dismissMutation.mutate(reminder.id)}
							isPending={dismissMutation.isPending}
						/>
					))}
				</div>
			)}

			{/* Resource-owned reminders */}
			{resourceReminders.length > 0 && (
				<div className="space-y-3">
					<h2 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
						<Link2 className="w-5 h-5" />
						From Bills & Tasks
					</h2>
					{resourceReminders.map((reminder) => (
						<ReminderCard
							key={reminder.id}
							reminder={reminder}
							onDismiss={() => dismissMutation.mutate(reminder.id)}
							isPending={dismissMutation.isPending}
							isResourceOwned
						/>
					))}
				</div>
			)}
		</div>
	);
}

function ReminderCard({
	reminder,
	onDismiss,
	isPending,
	isResourceOwned = false,
}: {
	reminder: ReminderResponse;
	onDismiss: () => void;
	isPending: boolean;
	isResourceOwned?: boolean;
}) {
	const remindAt = new Date(reminder.remindAt);
	const isOverdue = isPast(remindAt) && !isToday(remindAt);
	const isDueToday = isToday(remindAt);

	const getSourceLink = () => {
		if (reminder.source === 'bill' && reminder.sourceEntityId) {
			return ROUTES.BILLS;
		}
		return null;
	};

	const sourceLink = getSourceLink();

	return (
		<Card className={`transition-colors ${isOverdue ? "border-destructive/50" : ""}`}>
			<CardContent className="flex items-center gap-4 p-4">
				<div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isOverdue ? "bg-destructive/10 text-destructive" :
					isDueToday ? "bg-accent/10 text-accent-foreground" :
						"bg-muted"
					}`}>
					<Bell className="w-5 h-5" />
				</div>

				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="font-medium">{reminder.title}</span>
						{isResourceOwned && (
							<Badge variant="outline" className="text-xs">
								{reminder.source}
							</Badge>
						)}
					</div>
					{reminder.description && (
						<p className="text-sm text-muted-foreground truncate">
							{reminder.description}
						</p>
					)}
					<div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
						<span className={`flex items-center gap-1 ${isOverdue ? "text-destructive" :
							isDueToday ? "text-accent-foreground" : ""
							}`}>
							<Clock className="w-3 h-3" />
							{isOverdue ? "Overdue: " : isDueToday ? "Today " : ""}
							{format(remindAt, isDueToday ? "h:mm a" : "MMM d, h:mm a")}
						</span>
						{sourceLink && (
							<Link to={sourceLink} className="flex items-center gap-1 text-primary hover:underline">
								<ExternalLink className="w-3 h-3" />
								View {reminder.source}
							</Link>
						)}
					</div>
				</div>

				<Button
					size="sm"
					variant="ghost"
					onClick={onDismiss}
					disabled={isPending}
					title="Dismiss"
				>
					<BellOff className="w-4 h-4" />
				</Button>
			</CardContent>
		</Card>
	);
}
