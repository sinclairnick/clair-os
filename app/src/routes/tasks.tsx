import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Check, Clock, AlertCircle, Trash2, LayoutList, Kanban, Circle } from "lucide-react";
import { useCurrentFamilyId } from "@/components/auth-provider";
import { tasksQuery, queryKeys, updateTaskMutation, createTaskMutation } from "@/lib/queries";
import { api } from "@/lib/api";
import { format, isPast, isToday } from "date-fns";
import { TaskBoard } from "@/components/task-board";
import { useAppStore } from "@/lib/store";
import { PageTitle } from "@/components/page-title";

const priorityColors = {
	low: "bg-secondary text-secondary-foreground",
	medium: "bg-accent text-accent-foreground",
	high: "bg-destructive text-destructive-foreground",
};

type Priority = "low" | "medium" | "high";
type TaskStatus = "todo" | "in_progress" | "done" | "canceled" | "pending";

export function TasksPage() {
	const familyId = useCurrentFamilyId();
	const queryClient = useQueryClient();

	const { taskViewMode, setTaskViewMode } = useAppStore();
	const viewMode = taskViewMode;
	const setViewMode = setTaskViewMode;

	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	// Form state
	const [newTaskTitle, setNewTaskTitle] = useState("");
	const [newTaskDescription, setNewTaskDescription] = useState("");
	const [newTaskPriority, setNewTaskPriority] = useState<Priority>("medium");
	const [newTaskDueDate, setNewTaskDueDate] = useState("");
	const [newTaskTags, setNewTaskTags] = useState("");

	const { data: tasks, isLoading, error } = useQuery(
		tasksQuery(familyId || "", undefined, {
			enabled: !!familyId,
		})
	);

	const updateMutation = useMutation({
		...updateTaskMutation({
			onSuccess: () => {
				if (familyId) {
					queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all(familyId) });
				}
			},
		}),
	});

	const createMutation = useMutation({
		...createTaskMutation({
			onSuccess: () => {
				if (familyId) {
					queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all(familyId) });
				}
				setIsCreateDialogOpen(false);
				resetForm();
			},
		}),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => api.tasks.delete(id),
		onSuccess: () => {
			if (familyId) {
				queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all(familyId) });
			}
		},
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

	const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
		updateMutation.mutate({ id: taskId, data: { status: newStatus } });
	};

	if (!familyId) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Please select a family first</p>
			</div>
		);
	}

	// Filter tasks
	const activeTasks = tasks?.filter((t) => t.status !== "done" && t.status !== "canceled") || [];
	const completedTasks = tasks?.filter((t) => t.status === "done" || t.status === "canceled") || [];

	return (
		<div className="space-y-6">
			<PageTitle title="Tasks" />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Tasks & Chores</h1>
					<p className="text-muted-foreground">
						Track household tasks and chores
					</p>
				</div>
				<div className="flex items-center gap-2">
					<div className="flex bg-muted rounded-md p-1">
						<Button
							variant={viewMode === "list" ? "secondary" : "ghost"}
							size="sm"
							onClick={() => setViewMode("list")}
							className="h-8 w-8 p-0"
						>
							<LayoutList className="w-4 h-4" />
						</Button>
						<Button
							variant={viewMode === "kanban" ? "secondary" : "ghost"}
							size="sm"
							onClick={() => setViewMode("kanban")}
							className="h-8 w-8 p-0"
						>
							<Kanban className="w-4 h-4" />
						</Button>
					</div>

					<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
						<DialogTrigger>
							<Button>
								<Plus className="w-4 h-4 mr-2" />
								Add Task
							</Button>
						</DialogTrigger>
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
									onClick={() => setIsCreateDialogOpen(false)}
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
				</div>
			</div>

			{isLoading && (
				<div className="flex items-center justify-center h-64">
					<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
				</div>
			)}

			{error && (
				<Card className="border-destructive">
					<CardContent className="pt-6">
						<p className="text-destructive">
							Failed to load tasks: {error.message}
						</p>
					</CardContent>
				</Card>
			)}

			{viewMode === "kanban" && tasks && (
				<TaskBoard tasks={tasks} onStatusChange={handleStatusChange} />
			)}

			{viewMode === "list" && (
				<div className="space-y-6">
					{tasks && tasks.length === 0 && (
						<Card>
							<CardHeader>
								<CardTitle>No tasks yet</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground">
									Add tasks and chores to keep your household running smoothly.
									Assign to family members and set up recurring schedules.
								</p>
							</CardContent>
						</Card>
					)}

					{activeTasks.length > 0 && (
						<div className="space-y-3">
							{activeTasks.map((task) => {
								const dueDate = task.dueDate ? new Date(task.dueDate) : null;
								const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);
								const isDueToday = dueDate && isToday(dueDate);

								// Normalize status
								const currentStatus = (task.status === 'pending' ? 'todo' : task.status) as TaskStatus;

								return (
									<Card
										key={task.id}
										className={`transition-colors ${isOverdue ? "border-destructive/50" : ""
											}`}
									>
										<CardContent className="flex items-center gap-4 p-4">
											<Select
												value={currentStatus}
												onValueChange={(val) => handleStatusChange(task.id, val as TaskStatus)}
											>
												<SelectTrigger className="w-[130px] h-8 text-xs">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="todo">To Do</SelectItem>
													<SelectItem value="in_progress">In Progress</SelectItem>
													<SelectItem value="done">Done</SelectItem>
													<SelectItem value="canceled">Canceled</SelectItem>
												</SelectContent>
											</Select>

											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 flex-wrap">
													<span className="font-medium">{task.title}</span>
													<Badge
														variant="secondary"
														className={priorityColors[task.priority]}
													>
														{task.priority}
													</Badge>
													{task.tags?.map(tag => (
														<Badge key={tag} variant="outline" className="text-xs">
															#{tag}
														</Badge>
													))}
												</div>
												{task.description && (
													<p className="text-sm text-muted-foreground truncate">
														{task.description}
													</p>
												)}
												<div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
													{dueDate && (
														<span
															className={`flex items-center gap-1 ${isOverdue
																? "text-destructive"
																: isDueToday
																	? "text-accent-foreground"
																	: ""
																}`}
														>
															{isOverdue ? (
																<AlertCircle className="w-3 h-3" />
															) : (
																<Clock className="w-3 h-3" />
															)}
															{isOverdue ? "Overdue: " : isDueToday ? "Today" : ""}
															{!isDueToday && format(dueDate, "MMM d")}
														</span>
													)}
													{task.assignee && (
														<span>Assigned to {task.assignee.name}</span>
													)}
												</div>
											</div>

											<Button
												size="icon"
												variant="ghost"
												className="shrink-0"
												onClick={() => deleteMutation.mutate(task.id)}
												disabled={deleteMutation.isPending}
											>
												<Trash2 className="w-4 h-4 text-muted-foreground" />
											</Button>
										</CardContent>
									</Card>
								);
							})}
						</div>
					)}

					{completedTasks.length > 0 && (
						<div className="space-y-3">
							<h2 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
								<Check className="w-5 h-5" />
								Completed ({completedTasks.length})
							</h2>
							{completedTasks.map((task) => (
								<Card key={task.id} className="opacity-60">
									<CardContent className="flex items-center gap-4 p-4">
										<div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
											<Check className="w-4 h-4" />
										</div>
										<span className="line-through text-muted-foreground flex-1">
											{task.title}
										</span>
										<Button
											size="icon"
											variant="ghost"
											className="shrink-0"
											onClick={() => updateMutation.mutate({ id: task.id, data: { status: 'todo' } })}
											title="Reopen"
										>
											<Circle className="w-4 h-4 text-muted-foreground" />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											onClick={() => deleteMutation.mutate(task.id)}
											disabled={deleteMutation.isPending}
										>
											<Trash2 className="w-4 h-4 text-muted-foreground" />
										</Button>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
