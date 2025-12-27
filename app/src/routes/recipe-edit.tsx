import { useRef, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller, useWatch, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RecipeEditor, type RecipeEditorRef, type IngredientMention } from "@/components/editor";
import { ArrowLeft, Loader2, Plus, X, Clock, Users, Save, Trash2, ChevronDown, ChevronRight, FolderPlus, GripVertical } from "lucide-react";
import { draggable, dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useCurrentFamilyId } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Common units for ingredient measurement - used as datalist suggestions
const COMMON_UNITS = [
	"cup", "cups", "tbsp", "tsp", "ml", "l", "fl oz",
	"g", "kg", "oz", "lb", "lbs",
	"whole", "piece", "pieces", "slice", "slices",
	"clove", "cloves", "bunch", "pinch", "can", "jar",
];

// Form schema
const ingredientSchema = z.object({
	id: z.string(),
	name: z.string().min(1, "Name is required"),
	quantity: z.string().optional(),
	unit: z.string().optional(),
	groupId: z.string().nullable().optional(),
});

const ingredientGroupSchema = z.object({
	id: z.string(),
	name: z.string().min(1, "Group name is required"),
	isExpanded: z.boolean().default(true),
});

const recipeFormSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().optional(),
	servings: z.number().min(1).default(4),
	yield: z.string().optional(),
	prepTimeMinutes: z.number().optional(),
	cookTimeMinutes: z.number().optional(),
	instructions: z.string().default(""),
	tags: z.array(z.string()).default([]),
	imageUrl: z.string().optional(),
	ingredientGroups: z.array(ingredientGroupSchema).default([]),
	ingredients: z.array(ingredientSchema).default([]),
});

type RecipeFormData = z.infer<typeof recipeFormSchema>;

interface IngredientRowProps {
	index: number;
	ingredient: any;
	onRemove: (index: number) => void;
	ingredientIdToFocus: string | null;
	onFocusHandled: () => void;
}

function IngredientRow({ index, ingredient, onRemove, ingredientIdToFocus, onFocusHandled }: IngredientRowProps) {
	const { register } = useFormContext();
	const ref = useRef<HTMLDivElement>(null);
	const dragHandleRef = useRef<HTMLDivElement>(null);
	const [isDraggedOver, setIsDraggedOver] = useState(false);
	const [isDragging, setIsDragging] = useState(false);

	const ingredientId = ingredient.id;
	const groupId = ingredient.groupId;

	useEffect(() => {
		const el = ref.current;
		const dragHandle = dragHandleRef.current;
		if (!el || !dragHandle) return;

		const d = draggable({
			element: el,
			dragHandle: dragHandle,
			getInitialData: () => ({ type: "ingredient", index, groupId, id: ingredientId }),
			onDragStart: () => setIsDragging(true),
			onDrop: () => setIsDragging(false),
		});

		const dt = dropTargetForElements({
			element: el,
			getData: () => ({ type: "ingredient", index, groupId, id: ingredientId }),
			onDragEnter: () => setIsDraggedOver(true),
			onDragLeave: () => setIsDraggedOver(false),
			onDrop: () => setIsDraggedOver(false),
		});

		return () => {
			d();
			dt();
		};
	}, [index, groupId, ingredientId]);

	return (
		<div
			ref={ref}
			className={cn(
				"flex items-center gap-2 p-1 rounded-md transition-colors relative",
				isDraggedOver && "bg-accent/20 border-t-2 border-accent",
				isDragging && "opacity-50"
			)}
		>
			<div
				ref={dragHandleRef}
				className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded text-muted-foreground shrink-0 touch-none"
			>
				<GripVertical className="w-4 h-4" />
			</div>
			<Input
				placeholder="Qty"
				{...register(`ingredients.${index}.quantity`)}
				ref={(e) => {
					register(`ingredients.${index}.quantity`).ref(e);
					if (e && ingredientIdToFocus && ingredient.id === ingredientIdToFocus) {
						e.focus();
						onFocusHandled();
					}
				}}
				className="w-16 h-8"
			/>
			<Input
				placeholder="Unit"
				{...register(`ingredients.${index}.unit`)}
				list="unit-suggestions"
				className="w-20 h-8"
			/>
			<Input
				placeholder="Ingredient name"
				{...register(`ingredients.${index}.name`)}
				className="flex-1 h-8"
			/>
			<Button
				type="button"
				size="icon"
				variant="ghost"
				className="shrink-0 h-8 w-8"
				onClick={() => onRemove(index)}
			>
				<X className="w-3 h-3 text-muted-foreground" />
			</Button>
		</div>
	);
}

interface IngredientGroupSectionProps {
	group: any;
	groupIndex: number;
	actualGroupId: string | null;
	ingredientFields: any[];
	ingredients: any[];
	handleAddIngredient: (groupId: string | null) => void;
	handleRemoveGroup: (index: number) => void;
	toggleGroupExpanded: (index: number) => void;
	ingredientIdToFocus: string | null;
	onFocusHandled: () => void;
	removeIngredient: (index: number) => void;
}

function IngredientGroupSection({
	group,
	groupIndex,
	actualGroupId,
	ingredientFields,
	ingredients,
	handleAddIngredient,
	handleRemoveGroup,
	toggleGroupExpanded,
	ingredientIdToFocus,
	onFocusHandled,
	removeIngredient,
}: IngredientGroupSectionProps) {
	const { register } = useFormContext();
	const ref = useRef<HTMLDivElement>(null);
	const dragHandleRef = useRef<HTMLDivElement>(null);
	const [isDraggedOver, setIsDraggedOver] = useState(false);
	const [isDragging, setIsDragging] = useState(false);

	useEffect(() => {
		const el = ref.current;
		const dragHandle = dragHandleRef.current;
		if (!el || !dragHandle) return;

		const d = draggable({
			element: el,
			dragHandle: dragHandle,
			getInitialData: () => ({ type: "group", index: groupIndex, id: group.id }),
			onDragStart: () => setIsDragging(true),
			onDrop: () => setIsDragging(false),
		});

		const dt = dropTargetForElements({
			element: el,
			getData: () => ({ type: "group", groupId: actualGroupId, index: groupIndex }),
			onDragEnter: () => setIsDraggedOver(true),
			onDragLeave: () => setIsDraggedOver(false),
			onDrop: () => setIsDraggedOver(false),
		});

		return () => {
			d();
			dt();
		};
	}, [groupIndex, group.id, actualGroupId]);

	const isExpanded = group.isExpanded ?? true;

	return (
		<div
			ref={ref}
			className={cn(
				"border rounded-lg transition-colors relative",
				isDraggedOver && "bg-accent/10 border-accent",
				isDragging && "opacity-50"
			)}
		>
			<div className="flex items-center gap-2 p-2 bg-muted/50 rounded-t-lg">
				<div
					ref={dragHandleRef}
					className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded text-muted-foreground shrink-0 touch-none"
				>
					<GripVertical className="w-4 h-4" />
				</div>
				<button
					type="button"
					onClick={() => toggleGroupExpanded(groupIndex)}
					className="p-1 hover:bg-muted rounded"
				>
					{isExpanded ? (
						<ChevronDown className="w-4 h-4" />
					) : (
						<ChevronRight className="w-4 h-4" />
					)}
				</button>
				<Input
					{...register(`ingredientGroups.${groupIndex}.name`)}
					className="flex-1 h-8 font-medium bg-transparent border-none"
				/>
				<Button
					type="button"
					size="icon"
					variant="ghost"
					className="h-6 w-6"
					onClick={() => handleAddIngredient(actualGroupId ?? null)}
				>
					<Plus className="w-3 h-3" />
				</Button>
				<Button
					type="button"
					size="icon"
					variant="ghost"
					className="h-6 w-6 text-muted-foreground hover:text-destructive"
					onClick={() => handleRemoveGroup(groupIndex)}
				>
					<X className="w-3 h-3" />
				</Button>
			</div>

			<div className={cn("p-2 space-y-1", { hidden: !isExpanded })}>
				{ingredientFields.filter((_, i) => ingredients[i]?.groupId === actualGroupId).length === 0 ? (
					<p className="text-xs text-muted-foreground text-center py-4 border-2 border-dashed border-muted rounded-md mb-1">
						Drop ingredients here
					</p>
				) : (
					ingredientFields.map((field, index) => {
						const ing = ingredients[index];
						if (ing?.groupId !== actualGroupId) return null;
						return (
							<IngredientRow
								key={field.id}
								index={index}
								ingredient={ing}
								onRemove={removeIngredient}
								ingredientIdToFocus={ingredientIdToFocus}
								onFocusHandled={onFocusHandled}
							/>
						);
					})
				)}
			</div>
		</div>
	);
}

export function RecipeEditPage({ isNew = false }: { isNew?: boolean }) {
	const { recipeId } = useParams<{ recipeId: string }>();
	const navigate = useNavigate();
	const familyId = useCurrentFamilyId();
	const queryClient = useQueryClient();
	const editorRef = useRef<RecipeEditorRef>(null);
	const [editorKey, setEditorKey] = useState(0);
	const [ingredientIdToFocus, setIngredientIdToFocus] = useState<string | null>(null);

	const form = useForm({
		resolver: zodResolver(recipeFormSchema),
		mode: "onChange",
		defaultValues: {
			title: "",
			description: "",
			servings: 4,
			yield: "",
			prepTimeMinutes: 0,
			cookTimeMinutes: 0,
			instructions: "",
			tags: [],
			imageUrl: "",
			ingredients: [],
		},
	});


	const { fields: ingredientFields, append: appendIngredient, remove: removeIngredientField, move: moveIngredientField } = useFieldArray({
		control: form.control,
		name: "ingredients",
	});

	const { fields: groupFields, append: appendGroup, remove: removeGroup, move: moveGroup } = useFieldArray({
		control: form.control,
		name: "ingredientGroups",
	});

	// Use useWatch for reactive form values
	const tags = useWatch({ control: form.control, name: "tags" }) || [];
	const ingredients = useWatch({ control: form.control, name: "ingredients" }) || [];
	const ingredientGroups = useWatch({ control: form.control, name: "ingredientGroups" }) || [];
	const instructions = useWatch({ control: form.control, name: "instructions" }) || "";
	const title = useWatch({ control: form.control, name: "title" }) || "";

	// Fetch existing recipe if editing
	const { data: recipe, isLoading } = useQuery({
		queryKey: queryKeys.recipes.detail(recipeId || ""),
		queryFn: () => api.recipes.get(recipeId!),
		enabled: !isNew && !!recipeId,
	});

	// Populate form when recipe loads
	useEffect(() => {
		if (recipe) {
			form.reset({
				title: recipe.title,
				description: recipe.description || "",
				servings: recipe.servings,
				yield: recipe.yield || "",
				prepTimeMinutes: recipe.prepTimeMinutes ?? 0,
				cookTimeMinutes: recipe.cookTimeMinutes ?? 0,
				instructions: recipe.instructions,
				tags: recipe.tags as string[],
				imageUrl: recipe.imageUrl || "",
				ingredientGroups: recipe.ingredientGroups?.map((group) => ({
					id: group.id,
					name: group.name,
					isExpanded: true,
				})) || [],
				ingredients: recipe.ingredients?.map((ing) => ({
					id: ing.id,
					name: ing.name,
					quantity: ing.quantity?.toString() || "",
					unit: ing.unit || "",
					groupId: ing.groupId || null,
				})) || [],
			});
			// Force editor to re-render with new content
			setEditorKey((k) => k + 1);
		}
	}, [recipe, form]);

	useEffect(() => {
		return monitorForElements({
			onDrop({ source, location }) {
				const destination = location.current.dropTargets[0];
				if (!destination) return;

				const sourceData = source.data;
				const destinationData = destination.data;

				// Ingredient reordering/moving
				if (sourceData.type === "ingredient") {
					const sourceIndex = sourceData.index as number;

					// Dropped on another ingredient -> reorder
					if (destinationData.type === "ingredient") {
						const destinationIndex = destinationData.index as number;
						if (sourceIndex !== destinationIndex) {
							moveIngredientField(sourceIndex, destinationIndex);
							// Also update groupId to match the destination's group
							const destGroupId = destinationData.groupId as string | null;
							form.setValue(`ingredients.${destinationIndex}.groupId`, destGroupId);
						}
					}
					// Dropped on a group section area -> move to that group
					else if (destinationData.type === "group") {
						const destGroupId = destinationData.groupId as string | null;
						form.setValue(`ingredients.${sourceIndex}.groupId`, destGroupId);
						// Move to end of array to appear last in the group
						moveIngredientField(sourceIndex, ingredientFields.length - 1);
					}
				}

				// Group reordering
				if (sourceData.type === "group") {
					const sourceIndex = sourceData.index as number;
					if (destinationData.type === "group") {
						const destinationIndex = destinationData.index as number;
						if (sourceIndex !== destinationIndex) {
							moveGroup(sourceIndex, destinationIndex);
						}
					}
				}
			},
		});
	}, [moveIngredientField, moveGroup, form, ingredientFields.length]);


	const saveMutation = useMutation({
		mutationFn: async (data: RecipeFormData) => {
			// Get instructions as JSON string from BlockNote editor
			const instructionsJSON = editorRef.current?.getJSON();
			const instructionsString = instructionsJSON ? JSON.stringify(instructionsJSON) : data.instructions;

			const payload = {
				familyId: familyId!,
				title: data.title,
				description: data.description || undefined,
				servings: data.servings,
				yield: data.yield || undefined,
				prepTimeMinutes: data.prepTimeMinutes,
				cookTimeMinutes: data.cookTimeMinutes,
				instructions: instructionsString,
				tags: data.tags,
				imageUrl: data.imageUrl || undefined,
				ingredientGroups: data.ingredientGroups.map((group, index) => ({
					id: group.id,
					name: group.name,
					sortOrder: index,
				})),
				ingredients: data.ingredients.map((ing, index) => ({
					id: ing.id,
					recipeId: "",
					name: ing.name,
					quantity: ing.quantity ? parseFloat(ing.quantity) : 1,
					unit: ing.unit || "",
					groupId: ing.groupId || null,
					sortOrder: index,
				})),
			};

			if (isNew) {
				return api.recipes.create(payload);
			} else {
				return api.recipes.update(recipeId!, payload);
			}
		},
		onSuccess: () => {
			if (familyId) {
				queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all(familyId) });
			}
			if (recipeId) {
				queryClient.invalidateQueries({ queryKey: queryKeys.recipes.detail(recipeId) });
			}
			toast.success(isNew ? "Recipe created successfully" : "Recipe updated successfully");
			navigate("/recipes");
		},
		onError: (error: Error) => {
			toast.error(`Failed to save recipe: ${error.message}`);
		}
	});

	const deleteMutation = useMutation({
		mutationFn: () => api.recipes.delete(recipeId!),
		onSuccess: () => {
			if (familyId) {
				queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all(familyId) });
			}
			toast.success("Recipe deleted");
			navigate("/recipes");
		},
		onError: () => {
			toast.error("Failed to delete recipe");
		}
	});

	const handleAddTag = (tag: string) => {
		if (tag.trim() && !tags.includes(tag.trim())) {
			form.setValue("tags", [...tags, tag.trim()]);
		}
	};

	const handleRemoveTag = (tag: string) => {
		form.setValue("tags", tags.filter((t) => t !== tag));
	};

	const handleAddIngredient = (groupId: string | null = null) => {
		const newId = crypto.randomUUID();
		setIngredientIdToFocus(newId);
		appendIngredient({ id: newId, name: "", quantity: "", unit: "", groupId });
	};

	const removeIngredient = (index: number) => {
		removeIngredientField(index);
	};

	const handleAddGroup = () => {
		appendGroup({ id: crypto.randomUUID(), name: "New Section", isExpanded: true });
	};

	const toggleGroupExpanded = (groupIndex: number) => {
		const isExpanded = ingredientGroups?.[groupIndex]?.isExpanded ?? true;
		form.setValue(`ingredientGroups.${groupIndex}.isExpanded`, !isExpanded);
	};

	const handleRemoveGroup = (groupIndex: number) => {
		const groupId = ingredientGroups?.[groupIndex]?.id;
		// Move all ingredients in this group to ungrouped
		ingredients?.forEach((ing, index) => {
			if (ing.groupId === groupId) {
				form.setValue(`ingredients.${index}.groupId`, null);
			}
		});
		removeGroup(groupIndex);
	};

	// Handle ingredients extracted from editor mentions
	const handleIngredientsChange = (extractedIngredients: IngredientMention[]) => {
		setIngredientIdToFocus(null);
		if (!ingredients) return;

		// Track what's being added in this cycle to prevent duplicates if useWatch hasn't updated yet
		const addedInThisCycle = new Set<string>();

		extractedIngredients.forEach((mentioned) => {
			const normalizedName = mentioned.name.trim().toLowerCase();
			if (!normalizedName) return;

			// Check if we already have this ingredient in the form OR added in this cycle
			const alreadyExists = ingredients.some(
				(ing) => (ing.id && mentioned.id && ing.id === mentioned.id) ||
					(ing.name.trim().toLowerCase() === normalizedName)
			) || addedInThisCycle.has(normalizedName);

			if (!alreadyExists) {
				addedInThisCycle.add(normalizedName);
				appendIngredient({
					id: mentioned.id || crypto.randomUUID(),
					name: mentioned.name.trim(),
					quantity: mentioned.quantity ? mentioned.quantity.toString() : "",
					unit: mentioned.unit || "",
					groupId: null,
				});
			}
		});
	};

	const onSubmit = form.handleSubmit((data) => {
		saveMutation.mutate(data);
	});

	// Check if form can be saved - need title at minimum
	const canSave = title.trim().length > 0;

	if (!familyId) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Please select a family first</p>
			</div>
		);
	}

	if (!isNew && isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<FormProvider {...form}>

			<form onSubmit={onSubmit} className="space-y-6 min-h-[150vh]">
				{/* Datalist for unit suggestions */}
				<datalist id="unit-suggestions">
					{COMMON_UNITS.map((unit) => (
						<option key={unit} value={unit} />
					))}
				</datalist>

				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Button type="button" variant="ghost" size="icon" onClick={() => navigate("/recipes")}>
							<ArrowLeft className="w-5 h-5" />
						</Button>
						<h1 className="text-2xl font-bold">
							{isNew ? "New Recipe" : "Edit Recipe"}
						</h1>
					</div>
					<div className="flex items-center gap-2">
						{!isNew && (
							<Button
								type="button"
								variant="outline"
								onClick={() => deleteMutation.mutate()}
								disabled={deleteMutation.isPending}
							>
								<Trash2 className="w-4 h-4 mr-2" />
								Delete
							</Button>
						)}
						<Button type="submit" disabled={saveMutation.isPending || !canSave}>
							{saveMutation.isPending ? (
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<Save className="w-4 h-4 mr-2" />
							)}
							Save Recipe
						</Button>
					</div>
				</div>

				<div className="grid gap-6 lg:grid-cols-3">
					{/* Main content - LEFT column */}
					<div className="lg:col-span-2 space-y-6">
						{/* Title & Description */}
						<Card>
							<CardContent className="pt-6 space-y-4">
								<div>
									<label className="text-sm font-medium">Title *</label>
									<Input
										placeholder="Recipe title"
										{...form.register("title")}
										className={cn("!text-2xl font-bold py-6", form.formState.errors.title && "border-destructive")}
									/>
									{form.formState.errors.title && (
										<p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
									)}
								</div>
								<div>
									<label className="text-sm font-medium">Description</label>
									<Textarea
										placeholder="Brief description of the recipe"
										{...form.register("description")}
										rows={2}
									/>
								</div>
							</CardContent>
						</Card>

						{/* Ingredients */}
						<Card>
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between">
									<CardTitle>Ingredients</CardTitle>
									<div className="flex gap-2">
										<Button type="button" size="sm" variant="outline" onClick={handleAddGroup}>
											<FolderPlus className="w-4 h-4 mr-1" />
											Add Section
										</Button>
										<Button type="button" size="sm" variant="secondary" onClick={() => handleAddIngredient()}>
											<Plus className="w-4 h-4 mr-1" />
											Add
										</Button>
									</div>
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								{/* Ingredient Groups */}
								{groupFields.map((group, groupIndex) => {
									const actualGroupId = ingredientGroups[groupIndex]?.id;
									return (
										<IngredientGroupSection
											key={group.id}
											group={group}
											groupIndex={groupIndex}
											actualGroupId={actualGroupId}
											ingredientFields={ingredientFields}
											ingredients={ingredients}
											handleAddIngredient={handleAddIngredient}
											handleRemoveGroup={handleRemoveGroup}
											toggleGroupExpanded={toggleGroupExpanded}
											ingredientIdToFocus={ingredientIdToFocus}
											onFocusHandled={() => setIngredientIdToFocus(null)}
											removeIngredient={removeIngredient}
										/>
									);
								})}

								{/* Ungrouped Ingredients */}
								{(() => {
									const ungroupedIngredients = ingredientFields.filter((_, i) => !ingredients[i]?.groupId);
									if (ungroupedIngredients.length === 0 && groupFields.length > 0) return null;

									return (
										<div className="space-y-2">
											{groupFields.length > 0 && (
												<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ungrouped</p>
											)}
											{ingredientFields.length === 0 ? (
												<p className="text-sm text-muted-foreground text-center py-4">
													No ingredients added yet. Click "Add" or use @mentions in instructions.
												</p>
											) : (
												ingredientFields.map((field, index) => {
													const ing = ingredients[index];
													if (ing?.groupId) return null;
													return (
														<IngredientRow
															key={field.id}
															index={index}
															ingredient={ing}
															onRemove={removeIngredient}
															ingredientIdToFocus={ingredientIdToFocus}
															onFocusHandled={() => setIngredientIdToFocus(null)}
														/>
													);
												})
											)}
										</div>
									);
								})()}
							</CardContent>
						</Card>

						{/* Instructions */}
						<Card>
							<CardHeader>
								<CardTitle>Instructions</CardTitle>
								<p className="text-sm text-muted-foreground">
									Type <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">@</kbd> for ingredients,
									<kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono ml-1">#</kbd> for timers (e.g. #5 minutes)
								</p>
							</CardHeader>
							<CardContent>
								<div className="border border-border rounded-lg overflow-hidden">
									<RecipeEditor
										key={editorKey}
										ref={editorRef}
										content={instructions}
										onChange={(html) => form.setValue("instructions", html)}
										onIngredientsChange={handleIngredientsChange}
										existingIngredients={(ingredients ?? []).filter((i, idx, arr) => arr.findIndex(x => x.name.trim().toLowerCase() === i.name.trim().toLowerCase()) === idx).map((i) => ({
											id: i.id,
											name: i.name,
											quantity: i.quantity ? parseFloat(i.quantity) : undefined,
											unit: i.unit,
										}))}
									/>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Sidebar - RIGHT column */}
					<div className="space-y-6">
						{/* Servings & Time */}
						<Card>
							<CardHeader className="pb-3">
								<CardTitle>Details</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<label className="text-sm font-medium flex items-center gap-1 mb-1">
										<Users className="w-4 h-4" />
										Servings
									</label>
									<Controller
										control={form.control}
										name="servings"
										render={({ field }) => (
											<Input
												type="number"
												min={1}
												{...field}
												onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
											/>
										)}
									/>
								</div>
								<div>
									<label className="text-sm font-medium flex items-center gap-1 mb-1">
										Yield
									</label>
									<Input
										placeholder="e.g. 12 cookies"
										{...form.register("yield")}
									/>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="text-sm font-medium flex items-center gap-1 mb-1">
											<Clock className="w-4 h-4" />
											Prep (min)
										</label>
										<Controller
											control={form.control}
											name="prepTimeMinutes"
											defaultValue={0}
											render={({ field }) => (
												<Input
													type="number"
													min={0}
													placeholder="0"
													value={field.value}
													onChange={(e) => field.onChange(parseInt(e.target.value))}
												/>
											)}
										/>
									</div>
									<div>
										<label className="text-sm font-medium flex items-center gap-1 mb-1">
											<Clock className="w-4 h-4" />
											Cook (min)
										</label>
										<Controller
											control={form.control}
											name="cookTimeMinutes"
											defaultValue={0}
											render={({ field }) => (
												<Input
													type="number"
													min={0}
													placeholder="0"
													value={field.value}
													onChange={(e) => field.onChange(parseInt(e.target.value))}
												/>
											)}
										/>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Tags */}
						<Card>
							<CardHeader className="pb-3">
								<CardTitle>Tags</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex gap-2">
									<Input
										placeholder="Add tag..."
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												handleAddTag((e.target as HTMLInputElement).value);
												(e.target as HTMLInputElement).value = "";
											}
										}}
									/>
									<Button
										type="button"
										size="icon"
										variant="secondary"
										onClick={(e) => {
											const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
											handleAddTag(input.value);
											input.value = "";
										}}
									>
										<Plus className="w-4 h-4" />
									</Button>
								</div>
								<div className="flex flex-wrap gap-2">
									{tags.length === 0 ? (
										<p className="text-sm text-muted-foreground">No tags</p>
									) : (
										tags.map((tag) => (
											<Badge key={tag} variant="secondary" className="gap-1 pr-1">
												{tag}
												<button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-destructive rounded-full">
													<X className="w-3 h-3" />
												</button>
											</Badge>
										))
									)}
								</div>
							</CardContent>
						</Card>

						{/* Image */}
						<Card className="overflow-hidden">
							{form.watch("imageUrl") && (
								<div className="aspect-video w-full overflow-hidden border-b">
									<img
										src={form.watch("imageUrl")}
										alt="Recipe preview"
										className="w-full h-full object-cover"
										onError={(e) => {
											(e.target as HTMLImageElement).style.display = 'none';
										}}
									/>
								</div>
							)}
							<CardHeader className="pb-3 px-4">
								<div className="flex items-center justify-between gap-2">
									<CardTitle>Image</CardTitle>
									{form.watch("imageUrl") && (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-7 px-2 text-muted-foreground hover:text-destructive"
											onClick={() => {
												form.setValue("imageUrl", "");
												// Also clear file input if possible
												const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
												if (fileInput) fileInput.value = '';
											}}
										>
											<X className="w-3.5 h-3.5 mr-1" />
											Clear
										</Button>
									)}
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<label className="text-sm font-medium">Upload Image</label>
									<div className="flex gap-2">
										<Input
											type="file"
											accept="image/*"
											onChange={async (e) => {
												const file = e.target.files?.[0];
												if (file) {
													try {
														const { url } = await api.storage.upload(file);
														form.setValue("imageUrl", url);
														toast.success("Image uploaded");
													} catch (error) {
														toast.error("Failed to upload image");
													}
												}
											}}
										/>
									</div>
								</div>

								<div className="relative">
									<div className="absolute inset-0 flex items-center">
										<span className="w-full border-t" />
									</div>
									<div className="relative flex justify-center text-xs uppercase">
										<span className="bg-background px-2 text-muted-foreground">Or Use URL</span>
									</div>
								</div>

								<Input
									placeholder="Image URL"
									{...form.register("imageUrl")}
								/>
							</CardContent>
						</Card>
					</div>
				</div>
			</form >
		</FormProvider>
	);
}
