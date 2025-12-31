import { useRef, useEffect, useState } from "react";
import { useFormContext, Controller, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, GripVertical } from "lucide-react";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { cn } from "@/lib/utils";

interface IngredientRowProps {
	index: number;
	onRemove: (index: number) => void;
	ingredientIdToFocus: string | null;
	onFocusHandled: () => void;
}

export function IngredientRow({ index, onRemove, ingredientIdToFocus, onFocusHandled }: IngredientRowProps) {
	const { control } = useFormContext();
	const ref = useRef<HTMLDivElement>(null);
	const dragHandleRef = useRef<HTMLDivElement>(null);
	const [isDraggedOver, setIsDraggedOver] = useState(false);
	const [isDragging, setIsDragging] = useState(false);

	// Targeted watch for this specific ingredient to avoid top-level re-renders
	// and ensure we have the data for DND logic
	const ingredient = useWatch({
		control,
		name: `ingredients.${index}`,
	});

	useEffect(() => {
		const el = ref.current;
		const dragHandle = dragHandleRef.current;
		if (!el || !dragHandle || !ingredient) return;

		const d = draggable({
			element: el,
			dragHandle: dragHandle,
			getInitialData: () => ({
				type: "ingredient",
				index,
				groupId: ingredient.groupId,
				id: ingredient.id
			}),
			onDragStart: () => setIsDragging(true),
			onDrop: () => setIsDragging(false),
		});

		const dt = dropTargetForElements({
			element: el,
			getData: () => ({
				type: "ingredient",
				index,
				groupId: ingredient.groupId,
				id: ingredient.id
			}),
			onDragEnter: () => setIsDraggedOver(true),
			onDragLeave: () => setIsDraggedOver(false),
			onDrop: () => setIsDraggedOver(false),
		});

		return () => {
			d();
			dt();
		};
	}, [index, ingredient?.groupId, ingredient?.id]);

	if (!ingredient) return null;

	return (
		<div
			ref={ref}
			className={cn(
				"flex items-center gap-1.5 md:gap-2 p-1.5 md:p-1 rounded-md transition-colors relative",
				isDraggedOver && "bg-accent/20 border-t-2 border-accent",
				isDragging && "opacity-50"
			)}
		>
			<div
				ref={dragHandleRef}
				className="cursor-grab active:cursor-grabbing min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 md:p-1 flex items-center justify-center hover:bg-muted rounded text-muted-foreground shrink-0"
				style={{ touchAction: 'none' }}
			>
				<GripVertical className="w-5 h-5 md:w-4 md:h-4" />
			</div>
			<Controller
				name={`ingredients.${index}.quantity`}
				control={control}
				render={({ field }) => (
					<Input
						{...field}
						placeholder="Qty"
						ref={(e) => {
							field.ref(e);
							if (e && ingredientIdToFocus && ingredient.id === ingredientIdToFocus) {
								e.focus();
								onFocusHandled();
							}
						}}
						className="w-14 md:w-16"
					/>
				)}
			/>
			<Controller
				name={`ingredients.${index}.unit`}
				control={control}
				render={({ field }) => (
					<Input
						{...field}
						placeholder="Unit"
						list="unit-suggestions"
						className="w-16 md:w-20"
					/>
				)}
			/>
			<Controller
				name={`ingredients.${index}.name`}
				control={control}
				render={({ field }) => (
					<Input
						{...field}
						placeholder="Ingredient name"
						className="flex-1 min-w-0"
					/>
				)}
			/>
			<Button
				type="button"
				size="icon"
				variant="ghost"
				className="shrink-0"
				onClick={() => onRemove(index)}
			>
				<X className="w-4 h-4 md:w-3 md:h-3 text-muted-foreground" />
			</Button>
		</div>
	);
}
