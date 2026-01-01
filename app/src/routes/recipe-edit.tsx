import { useRef, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { type RecipeEditorRef, type IngredientMention } from "@/components/editor";
import { useCurrentFamilyId } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PageTitle } from "@/components/page-title";

// Sub-components
import { IngredientsList } from "./recipe-edit/components/ingredients-list";
import { InstructionsSection } from "./recipe-edit/components/instructions-section";
import { RecipeHeader } from "./recipe-edit/components/recipe-header";
import { RecipeBasicInfo } from "./recipe-edit/components/recipe-basic-info";
import { RecipeDetailsSidebar } from "./recipe-edit/components/recipe-details-sidebar";
import { RecipeTags } from "./recipe-edit/components/recipe-tags";
import { RecipeImage } from "./recipe-edit/components/recipe-image";

// Types and Schemas
import { recipeFormSchema, type RecipeFormData, COMMON_UNITS } from "./recipe-edit/types";

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
			ingredientGroups: [],
			ingredients: [],
		},
	});

	const formTitle = form.watch("title");
	const pageTitle = isNew ? "New Recipe" : `Edit ${formTitle || "Recipe"}`;

	const { fields: ingredientFields, append: appendIngredient, remove: removeIngredientField } = useFieldArray({
		control: form.control,
		name: "ingredients",
	});

	const { fields: groupFields, append: appendGroup, remove: removeGroup } = useFieldArray({
		control: form.control,
		name: "ingredientGroups",
	});

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



	const saveMutation = useMutation({
		mutationFn: async (data: RecipeFormData) => {
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
		const currentTags = form.getValues("tags") || [];
		if (tag.trim() && !currentTags.includes(tag.trim())) {
			form.setValue("tags", [...currentTags, tag.trim()]);
		}
	};

	const handleRemoveTag = (tag: string) => {
		const currentTags = form.getValues("tags") || [];
		form.setValue("tags", currentTags.filter((t) => t !== tag));
	};

	const handleAddIngredient = (groupId: string | null = null) => {
		const newId = crypto.randomUUID();
		setIngredientIdToFocus(newId);
		appendIngredient({ id: newId, name: "", quantity: "", unit: "", groupId });
	};

	const handleAddGroup = () => {
		appendGroup({ id: crypto.randomUUID(), name: "New Section", isExpanded: true });
	};

	const toggleGroupExpanded = (groupIndex: number) => {
		const currentGroups = form.getValues("ingredientGroups") || [];
		const isExpanded = currentGroups[groupIndex]?.isExpanded ?? true;
		form.setValue(`ingredientGroups.${groupIndex}.isExpanded`, !isExpanded);
	};

	const handleRemoveGroup = (groupIndex: number) => {
		const currentGroups = form.getValues("ingredientGroups") || [];
		const currentIngredients = form.getValues("ingredients") || [];
		const groupId = currentGroups[groupIndex]?.id;
		currentIngredients.forEach((ing: any, index: number) => {
			if (ing.groupId === groupId) {
				form.setValue(`ingredients.${index}.groupId`, null);
			}
		});
		removeGroup(groupIndex);
	};

	const handleIngredientsChange = (extractedIngredients: IngredientMention[]) => {
		setIngredientIdToFocus(null);
		const currentIngredients = form.getValues("ingredients") || [];
		const addedInThisCycle = new Set<string>();

		extractedIngredients.forEach((mentioned) => {
			const normalizedName = mentioned.name.trim().toLowerCase();
			if (!normalizedName) return;

			const alreadyExists = currentIngredients.some(
				(ing: any) => ing.id === mentioned.id
			) || addedInThisCycle.has(mentioned.id || normalizedName);

			if (!alreadyExists) {
				const id = mentioned.id || crypto.randomUUID();
				addedInThisCycle.add(id);
				appendIngredient({
					id: id,
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
			<PageTitle title={pageTitle} />
			<form onSubmit={onSubmit} className="space-y-6 min-h-[150vh]">
				<datalist id="unit-suggestions">
					{COMMON_UNITS.map((unit) => (
						<option key={unit} value={unit} />
					))}
				</datalist>

				<RecipeHeader
					isNew={isNew}
					isSaving={saveMutation.isPending}
					isDeleting={deleteMutation.isPending}
					onDelete={() => deleteMutation.mutate()}
				/>

				<div className="grid gap-6 lg:grid-cols-3">
					<div className="lg:col-span-2 space-y-6">
						<RecipeBasicInfo />

						<Card>
							<IngredientsList
								groupFields={groupFields}
								ingredientFields={ingredientFields}
								ingredientIdToFocus={ingredientIdToFocus}
								setIngredientIdToFocus={setIngredientIdToFocus}
								handleAddIngredient={handleAddIngredient}
								handleAddGroup={handleAddGroup}
								handleRemoveGroup={handleRemoveGroup}
								toggleGroupExpanded={toggleGroupExpanded}
								removeIngredient={removeIngredientField}
							/>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Instructions</CardTitle>
								<p className="text-sm text-muted-foreground">
									Type <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">@</kbd> for ingredients,
									<kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono ml-1">#</kbd> for timers (e.g. #5 minutes)
								</p>
							</CardHeader>
							<InstructionsSection
								editorKey={editorKey}
								editorRef={editorRef}
								handleIngredientsChange={handleIngredientsChange}
							/>
						</Card>
					</div>

					<div className="space-y-6">
						<RecipeDetailsSidebar />
						<RecipeTags handleAddTag={handleAddTag} handleRemoveTag={handleRemoveTag} />
						<RecipeImage />
					</div>
				</div>
			</form>
		</FormProvider>
	);
}
