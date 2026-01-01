import { useEffect, useRef, useState } from "react";
import type { TaskResponse } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { draggable, dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { cn } from "@/lib/utils";

type TaskStatus = "todo" | "in_progress" | "done" | "canceled";

const COLUMNS: { id: TaskStatus; label: string }[] = [
	{ id: "todo", label: "To Do" },
	{ id: "in_progress", label: "In Progress" },
	{ id: "done", label: "Done" },
];

export function TaskBoard({ tasks, onStatusChange }: { tasks: TaskResponse[]; onStatusChange: (id: string, status: TaskStatus) => void }) {
	const [activeTasks, setActiveTasks] = useState(tasks);

	useEffect(() => {
		setActiveTasks(tasks);
	}, [tasks]);

	useEffect(() => {
		return monitorForElements({
			onDrop({ source, location }) {
				const destination = location.current.dropTargets[0];
				if (!destination) {
					return;
				}

				const taskId = source.data.taskId as string;
				const newStatus = destination.data.columnId as TaskStatus;
				const currentStatus = source.data.status as TaskStatus;

				if (newStatus && newStatus !== currentStatus) {
					onStatusChange(taskId, newStatus);
				}
			},
		});
	}, [onStatusChange]);

	return (
		<div className="flex gap-4 pb-4 overflow-x-auto max-w-6xl mx-auto w-full snap-x snap-mandatory">
			{COLUMNS.map((col) => (
				<Column
					key={col.id}
					columnId={col.id}
					title={col.label}
					tasks={activeTasks.filter((t) => (t.status === 'pending' ? 'todo' : t.status) === col.id)}
				/>
			))}
		</div>
	);
}

function Column({ columnId, title, tasks }: { columnId: TaskStatus; title: string; tasks: TaskResponse[] }) {
	const ref = useRef<HTMLDivElement>(null);
	const [isDraggedOver, setIsDraggedOver] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		return dropTargetForElements({
			element: el,
			getData: () => ({ columnId }),
			onDragEnter: () => setIsDraggedOver(true),
			onDragLeave: () => setIsDraggedOver(false),
			onDrop: () => setIsDraggedOver(false),
		});
	}, [columnId]);

	return (
		<div
			ref={ref}
			className={cn(
				"flex h-full w-[calc(100vw-2rem)] shrink-0 snap-center md:w-auto md:flex-1 md:min-w-[250px] md:max-w-md flex-col rounded-lg border bg-muted/50 p-4 transition-colors",
				isDraggedOver ? "bg-muted" : ""
			)}
		>
			<div className="mb-4 flex items-center justify-between">
				<h3 className="font-semibold">{title}</h3>
				<Badge variant="secondary">{tasks.length}</Badge>
			</div>
			<div className="flex flex-1 flex-col gap-3">
				{tasks.map((task) => (
					<TaskCard key={task.id} task={task} />
				))}
			</div>
		</div>
	);
}

function TaskCard({ task }: { task: TaskResponse }) {
	const ref = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		return draggable({
			element: el,
			getInitialData: () => ({ taskId: task.id, status: task.status === 'pending' ? 'todo' : task.status }),
			onDragStart: () => setIsDragging(true),
			onDrop: () => setIsDragging(false),
		});
	}, [task]);

	return (
		<Card
			ref={ref}
			className={cn(
				"cursor-grab active:cursor-grabbing hover:shadow-md transition-all",
				isDragging ? "opacity-50" : ""
			)}
		>
			<CardContent className="p-3 space-y-2">
				<div className="flex items-start justify-between gap-2">
					<span className="font-medium text-sm leading-tight">{task.title}</span>
					<Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'secondary' : 'outline'} className="text-[10px] h-5 px-1.5">
						{task.priority}
					</Badge>
				</div>

				{(task.tags.length > 0 || task.dueDate || task.assignee) && (
					<div className="flex flex-wrap gap-1 mt-2">
						{task.tags.map(tag => (
							<span key={tag} className="text-[10px] bg-muted px-1 rounded text-muted-foreground">#{tag}</span>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
