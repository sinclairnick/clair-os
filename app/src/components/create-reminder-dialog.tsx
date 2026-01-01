
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Bell } from "lucide-react";
import { useCurrentFamilyId } from "@/components/auth-provider";
import { api, type ReminderCreateInput } from "@/lib/api";
import { pushManager } from "@/lib/push-manager";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queries";

interface CreateReminderDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateReminderDialog({ open, onOpenChange }: CreateReminderDialogProps) {
	const familyId = useCurrentFamilyId();
	const queryClient = useQueryClient();

	const [newTitle, setNewTitle] = useState("");
	const [newDescription, setNewDescription] = useState("");
	const [newRemindAt, setNewRemindAt] = useState("");
	const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);
	const [isSubscribing, setIsSubscribing] = useState(false);

	const createMutation = useMutation({
		mutationFn: (data: ReminderCreateInput) => api.reminders.create(data),
		onSuccess: () => {
			if (familyId) {
				queryClient.invalidateQueries({ queryKey: ['reminders', familyId] });
				queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary(familyId) });
			}
			onOpenChange(false);
			resetForm();
		},
	});

	const resetForm = () => {
		setNewTitle("");
		setNewDescription("");
		setNewRemindAt("");
	};

	const handleCreate = async () => {
		if (!familyId || !newTitle.trim() || !newRemindAt) return;

		// Check push status
		const status = await pushManager.getStatus();

		if (status === 'unsubscribed') {
			setIsPushDialogOpen(true);
			return;
		}

		if (status === 'unsupported' || status === 'denied') {
			toast.warning("Warning: You won't receive a push notification on this device.", {
				description: status === 'denied' ? "Notifications are blocked by your browser." : "Your browser doesn't support push notifications.",
			});
		}

		executeCreate();
	};

	const executeCreate = () => {
		if (!familyId) return;
		createMutation.mutate({
			familyId,
			title: newTitle.trim(),
			description: newDescription.trim() || undefined,
			remindAt: new Date(newRemindAt).toISOString(),
		});
	};

	const handleEnablePush = async () => {
		setIsSubscribing(true);
		try {
			await pushManager.subscribe();
			toast.success("Notifications enabled!");
			setIsPushDialogOpen(false);
			executeCreate();
		} catch (error: any) {
			toast.error(error.message || "Failed to enable notifications");
		} finally {
			setIsSubscribing(false);
		}
	};

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create Reminder</DialogTitle>
						<DialogDescription>
							Add a new reminder for yourself or your family.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<Input
							placeholder="Reminder title"
							value={newTitle}
							onChange={(e) => setNewTitle(e.target.value)}
						/>
						<Textarea
							placeholder="Description (optional)"
							value={newDescription}
							onChange={(e) => setNewDescription(e.target.value)}
							rows={2}
						/>
						<div className="space-y-2">
							<label className="text-sm font-medium">Remind At</label>
							<Input
								type="datetime-local"
								value={newRemindAt}
								onChange={(e) => setNewRemindAt(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleCreate}
							disabled={createMutation.isPending || !newTitle.trim() || !newRemindAt}
						>
							{createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
							Create
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={isPushDialogOpen} onOpenChange={setIsPushDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Bell className="w-5 h-5 text-accent-foreground" />
							Enable Notifications?
						</DialogTitle>
						<DialogDescription>
							To receive an alert for this reminder, you need to enable push notifications on this device.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex-col sm:flex-row gap-2">
						<Button
							variant="ghost"
							onClick={() => {
								setIsPushDialogOpen(false);
								toast.warning("Reminder created, but you won't receive a push notification.");
								executeCreate();
							}}
							disabled={isSubscribing}
						>
							Create anyway
						</Button>
						<Button onClick={handleEnablePush} disabled={isSubscribing}>
							{isSubscribing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
							Enable & Create
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
