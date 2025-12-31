import { useRef, useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { cn } from "@/lib/utils";
import { IngredientRow } from "./ingredient-row";

interface IngredientGroupSectionProps {
	groupIndex: number;
	ingredientFields: any[];
	handleAddIngredient: (groupId: string | null) => void;
	handleRemoveGroup: (index: number) => void;
	toggleGroupExpanded: (index: number) => void;
	ingredientIdToFocus: string | null;
	onFocusHandled: () => void;
	removeIngredient: (index: number) => void;
}

export function IngredientGroupSection({
	groupIndex,
	ingredientFields,
	handleAddIngredient,
	handleRemoveGroup,
	toggleGroupExpanded,
	ingredientIdToFocus,
	onFocusHandled,
	removeIngredient,
}: IngredientGroupSectionProps) {
	const { register, control } = useFormContext();
	const ref = useRef<HTMLDivElement>(null);
	const dragHandleRef = useRef<HTMLDivElement>(null);
	const [isDraggedOver, setIsDraggedOver] = useState(false);
	const [isDragging, setIsDragging] = useState(false);

	// Watch this specific group's data for stability
	const group = useWatch({
		control,
		name: `ingredientGroups.${groupIndex}`,
	});

	// Watch all ingredients for filtering - but safely
	const ingredients = useWatch({
		control,
		name: "ingredients",
	}) || [];

	const actualGroupId = group?.id;

	// Use a ref to store the current group data so we can read it in callbacks
	// without causing re-registration of drag/drop handlers
	const groupRef = useRef({ group, actualGroupId });
	useEffect(() => {
		groupRef.current = { group, actualGroupId };
	}, [group, actualGroupId]);

	useEffect(() => {
		const el = ref.current;
		const dragHandle = dragHandleRef.current;
		if (!el || !dragHandle) return;

		const d = draggable({
			element: el,
			dragHandle: dragHandle,
			getInitialData: () => {
				const { group: currentGroup } = groupRef.current;
				return { type: "group", index: groupIndex, id: currentGroup?.id ?? '' };
			},
			onDragStart: () => setIsDragging(true),
			onDrop: () => setIsDragging(false),
		});

		const dt = dropTargetForElements({
			element: el,
			getData: () => {
				const { actualGroupId: currentGroupId } = groupRef.current;
				return { type: "group", groupId: currentGroupId ?? null, index: groupIndex };
			},
			onDragEnter: () => setIsDraggedOver(true),
			onDragLeave: () => setIsDraggedOver(false),
			onDrop: () => setIsDraggedOver(false),
		});

		return () => {
			d();
			dt();
		};
	}, [groupIndex]); // Only re-register when groupIndex changes

	if (!group) return null;

	const isExpanded = group.isExpanded ?? true;

	// Safely get matching ingredients
	const groupIngredients = ingredientFields
		.map((field, index) => ({ field, index }))
		.filter(({ index }) => ingredients[index]?.groupId === actualGroupId);

	return (
		<div
			ref={ref}
			className={cn(
				"border rounded-lg transition-colors relative",
				isDraggedOver && "bg-accent/10 border-accent",
				isDragging && "opacity-50"
			)}
		>
			<div className="flex items-center gap-1.5 md:gap-2 p-2 bg-muted/50 rounded-t-lg">
				<div
					ref={dragHandleRef}
					className="cursor-grab active:cursor-grabbing min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 md:p-1 flex items-center justify-center hover:bg-muted rounded text-muted-foreground shrink-0"
					style={{ touchAction: 'none' }}
				>
					<GripVertical className="w-5 h-5 md:w-4 md:h-4" />
				</div>
				<button
					type="button"
					onClick={() => toggleGroupExpanded(groupIndex)}
					className="p-2 md:p-1 hover:bg-muted rounded min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
				>
					{isExpanded ? (
						<ChevronDown className="w-5 h-5 md:w-4 md:h-4" />
					) : (
						<ChevronRight className="w-5 h-5 md:w-4 md:h-4" />
					)}
				</button>
				<Input
					{...register(`ingredientGroups.${groupIndex}.name`)}
					className="flex-1 min-w-0 font-medium bg-transparent border-none"
				/>
				<Button
					type="button"
					size="icon-sm"
					variant="ghost"
					onClick={() => handleAddIngredient(actualGroupId ?? null)}
				>
					<Plus className="w-4 h-4 md:w-3 md:h-3" />
				</Button>
				<Button
					type="button"
					size="icon-sm"
					variant="ghost"
					className="text-muted-foreground hover:text-destructive"
					onClick={() => handleRemoveGroup(groupIndex)}
				>
					<X className="w-4 h-4 md:w-3 md:h-3" />
				</Button>
			</div>

			<div className={cn("p-2 space-y-1", { hidden: !isExpanded })}>
				{groupIngredients.length === 0 ? (
					<p className="text-xs text-muted-foreground text-center py-4 border-2 border-dashed border-muted rounded-md mb-1">
						Drop ingredients here
					</p>
				) : (
					groupIngredients.map(({ field, index }) => (
						<IngredientRow
							key={field.id}
							index={index}
							onRemove={removeIngredient}
							ingredientIdToFocus={ingredientIdToFocus}
							onFocusHandled={onFocusHandled}
						/>
					))
				)}
			</div>
		</div>
	);
}
