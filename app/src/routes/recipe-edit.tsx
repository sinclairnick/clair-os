import { useRef, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RecipeEditor, type RecipeEditorRef, type IngredientMention } from "@/components/editor";
import { ArrowLeft, Loader2, Plus, X, Clock, Users, Save, Trash2 } from "lucide-react";
import { useCurrentFamilyId } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
// ... imports ...
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
});

const recipeFormSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().optional(),
	servings: z.number().min(1).default(4),
	prepTimeMinutes: z.number().optional(),
	cookTimeMinutes: z.number().optional(),
	instructions: z.string().default(""),
	tags: z.array(z.string()).default([]),
	imageUrl: z.string().optional(),
	ingredients: z.array(ingredientSchema).default([]),
});

type RecipeFormData = z.infer<typeof recipeFormSchema>;

export function RecipeEditPage({ isNew = false }: { isNew?: boolean }) {
	const { recipeId } = useParams<{ recipeId: string }>();
	const navigate = useNavigate();
	const familyId = useCurrentFamilyId();
	const queryClient = useQueryClient();
	const editorRef = useRef<RecipeEditorRef>(null);
	const [editorKey, setEditorKey] = useState(0);

	const form = useForm({
		resolver: zodResolver(recipeFormSchema),
		mode: "onChange",
		defaultValues: {
			title: "",
			description: "",
			servings: 4,
			prepTimeMinutes: 0,
			cookTimeMinutes: 0,
			instructions: "",
			tags: [],
			imageUrl: "",
			ingredients: [],
		},
	});



	const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } = useFieldArray({
		control: form.control,
		name: "ingredients",
	});

	// Use useWatch for reactive form values
	const tags = useWatch({ control: form.control, name: "tags" });
	const ingredients = useWatch({ control: form.control, name: "ingredients" });
	const instructions = useWatch({ control: form.control, name: "instructions" });
	const title = useWatch({ control: form.control, name: "title" });

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
				prepTimeMinutes: recipe.prepTimeMinutes ?? 0,
				cookTimeMinutes: recipe.cookTimeMinutes ?? 0,
				instructions: recipe.instructions,
				tags: recipe.tags as string[],
				imageUrl: recipe.imageUrl || "",
				ingredients: recipe.ingredients?.map((ing) => ({
					id: ing.id,
					name: ing.name,
					quantity: ing.quantity?.toString() || "",
					unit: ing.unit || "",
				})) || [],
			});
			// Force editor to re-render with new content
			setEditorKey((k) => k + 1);
		}
	}, [recipe, form]);


	const saveMutation = useMutation({
		mutationFn: async (data: RecipeFormData) => {
			const payload = {
				familyId: familyId!,
				title: data.title,
				description: data.description || undefined,
				servings: data.servings,
				prepTimeMinutes: data.prepTimeMinutes,
				cookTimeMinutes: data.cookTimeMinutes,
				instructions: editorRef.current?.getHTML() || data.instructions,
				tags: data.tags,
				imageUrl: data.imageUrl || undefined,
				ingredients: data.ingredients.map((ing) => ({
					id: ing.id,
					recipeId: "",
					name: ing.name,
					quantity: ing.quantity ? parseFloat(ing.quantity) : 1,
					unit: ing.unit || "",
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
			toast.success(isNew ? "Recipe created successfully" : "Recipe updated successfully");
			navigate("/recipes");
		},
		onError: () => {
			toast.error(isNew ? "Failed to create recipe" : "Failed to update recipe");
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

	const handleAddIngredient = () => {
		appendIngredient({ id: `new-${Date.now()}`, name: "", quantity: "", unit: "" });
	};

	// Handle ingredients extracted from editor mentions
	const handleIngredientsChange = (mentionedIngredients: IngredientMention[]) => {
		// Add any new mentioned ingredients to the form that aren't already there
		mentionedIngredients.forEach((mentioned) => {
			// Check if we already have this ingredient in the form
			const existingIndex = ingredients.findIndex(
				(ing) => (ing.id && mentioned.id && ing.id === mentioned.id) ||
					(ing.name.toLowerCase() === mentioned.name.toLowerCase())
			);

			// If it's a new ingredient mentions (either explictly new or just typed text matching nothing)
			if (existingIndex === -1 && mentioned.name.trim()) {
				appendIngredient({
					id: mentioned.id?.startsWith('new-') ? mentioned.id : `mention-${Date.now()}-${Math.random()}`,
					name: mentioned.name,
					quantity: mentioned.quantity?.toString() || "",
					unit: mentioned.unit || "",
				});
			} else if (existingIndex === -1 && mentioned.id) {
				// Case where we have an ID but it wasn't found in the list? Should imply it's existing but maybe removed?
				// If it's a known ID but not in the list, we should probably add it back if it exists in DB?
				// But for now, we assume if it's selected from suggestion, it's either in the list or common.
				// If it came from suggestion list of "existingIngredients", it must be in the form state already 
				// (since we pass form ingredients to suggestions).
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
		<form onSubmit={onSubmit} className="space-y-6">
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
									className={cn("text-lg", form.formState.errors.title && "border-destructive")}
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
								<Button type="button" size="sm" variant="secondary" onClick={handleAddIngredient}>
									<Plus className="w-4 h-4 mr-1" />
									Add
								</Button>
							</div>
						</CardHeader>
						<CardContent className="space-y-2">
							{ingredientFields.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-4">
									No ingredients added yet. Click "Add" or use @mentions in instructions.
								</p>
							) : (
								ingredientFields.map((field, index) => (
									<div key={field.id} className="flex items-center gap-2">
										<Input
											placeholder="Qty"
											{...form.register(`ingredients.${index}.quantity`)}
											className="w-16 h-9"
										/>
										<Input
											placeholder="Unit"
											{...form.register(`ingredients.${index}.unit`)}
											list="unit-suggestions"
											className="w-20 h-9"
										/>
										<Input
											placeholder="Ingredient name"
											{...form.register(`ingredients.${index}.name`)}
											className="flex-1 h-9"
										/>
										<Button
											type="button"
											size="icon"
											variant="ghost"
											className="shrink-0 h-9 w-9"
											onClick={() => removeIngredient(index)}
										>
											<X className="w-4 h-4 text-muted-foreground" />
										</Button>
									</div>
								))
							)}
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
									existingIngredients={ingredients.map((i) => ({
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
					<Card>
						<CardHeader className="pb-3">
							<CardTitle>Image</CardTitle>
						</CardHeader>
						<CardContent>
							<Input
								placeholder="Image URL"
								{...form.register("imageUrl")}
							/>
							{form.getValues("imageUrl") && (
								<div className="mt-3 aspect-video rounded-lg overflow-hidden bg-muted">
									<img
										src={form.getValues("imageUrl")}
										alt="Recipe preview"
										className="w-full h-full object-cover"
										onError={(e) => {
											(e.target as HTMLImageElement).style.display = 'none';
										}}
									/>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</form>
	);
}
