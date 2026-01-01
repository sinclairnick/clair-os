
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useCurrentFamilyId } from "@/components/auth-provider";
import { createTaskMutation, queryKeys } from "@/lib/queries";

type Priority = "low" | "medium" | "high";

interface CreateTaskDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateTaskDialog({ open, onOpenChange }: CreateTaskDialogProps) {
	const familyId = useCurrentFamilyId();
	const queryClient = useQueryClient();

	const [newTaskTitle, setNewTaskTitle] = useState("");
	const [newTaskDescription, setNewTaskDescription] = useState("");
	const [newTaskPriority, setNewTaskPriority] = useState<Priority>("medium");
	const [newTaskDueDate, setNewTaskDueDate] = useState("");
	const [newTaskTags, setNewTaskTags] = useState("");

	const createMutation = useMutation({
		...createTaskMutation({
			onSuccess: () => {
				if (familyId) {
					queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all(familyId) });
					queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary(familyId) });
				}
				onOpenChange(false);
				resetForm();
			},
		}),
	});

	const resetForm = () => {
		setNewTaskTitle("");
		setNewTaskDescription("");
		setNewTaskPriority("medium");
		setNewTaskDueDate("");
		setNewTaskTags("");
	};

	const handleCreateTask = () => {
		if (!familyId || !newTaskTitle.trim()) return;

		const tags = newTaskTags
			.split(',')
			.map(t => t.trim())
			.filter(t => t.length > 0);

		createMutation.mutate({
			familyId,
			title: newTaskTitle.trim(),
			description: newTaskDescription.trim() || undefined,
			priority: newTaskPriority,
			dueDate: newTaskDueDate || undefined,
			status: 'todo',
			tags: tags,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Task</DialogTitle>
					<DialogDescription>
						Add a new task or chore for your family.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<Input
						placeholder="Task title"
						value={newTaskTitle}
						onChange={(e) => setNewTaskTitle(e.target.value)}
					/>
					<Textarea
						placeholder="Description (optional)"
						value={newTaskDescription}
						onChange={(e) => setNewTaskDescription(e.target.value)}
						rows={2}
					/>
					<div className="space-y-2">
						<label className="text-sm font-medium">Tags</label>
						<Input
							placeholder="e.g. kitchen, chore (comma separated)"
							value={newTaskTags}
							onChange={(e) => setNewTaskTags(e.target.value)}
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">Priority</label>
							<Select
								value={newTaskPriority}
								onValueChange={(v) => setNewTaskPriority(v as Priority)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="low">Low</SelectItem>
									<SelectItem value="medium">Medium</SelectItem>
									<SelectItem value="high">High</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Due Date</label>
							<Input
								type="date"
								value={newTaskDueDate}
								onChange={(e) => setNewTaskDueDate(e.target.value)}
							/>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						onClick={handleCreateTask}
						disabled={createMutation.isPending || !newTaskTitle.trim()}
					>
						{createMutation.isPending && (
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
						)}
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
