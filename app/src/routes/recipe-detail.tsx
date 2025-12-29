import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Users, Edit, ShoppingCart, Clock, RotateCcw, Minus, Plus, Pin, ChevronDown, ChevronRight } from "lucide-react";
import { useCurrentFamilyId } from "@/components/auth-provider";
import { RecipeViewer } from "@/components/editor";
import { api } from "@/lib/api";
import { queryKeys, shoppingListsQuery } from "@/lib/queries";
import { useAppStore } from "@/lib/store";
import { useWatchedRecipesStore } from "@/lib/watched-recipes-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageTitle } from "@/components/page-title";

export function RecipeDetailPage() {
	const { recipeId } = useParams<{ recipeId: string }>();
	const navigate = useNavigate();
	const familyId = useCurrentFamilyId();
	const queryClient = useQueryClient();

	const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
	const [highlightedIngredientName, setHighlightedIngredientName] = useState<string | null>(null);
	const [addToListDialogOpen, setAddToListDialogOpen] = useState(false);
	const [scaleFactor, setScaleFactor] = useState(1);
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

	const { lastShoppingListId, setLastShoppingListId } = useAppStore();
	const [selectedListId, setSelectedListId] = useState<string>("");
	const [ingredientsToAdd, setIngredientsToAdd] = useState<Set<number>>(new Set());

	// Watched recipes store
	const {
		addRecipe: addToWatched,
		removeRecipe: removeFromWatched,
		isWatched,
		getRecipe: getWatchedRecipe,
		toggleIngredient: watchedToggleIngredient,
		setScaleFactor: watchedSetScaleFactor,
	} = useWatchedRecipesStore();

	const { data: recipe, isLoading, error } = useQuery({
		queryKey: queryKeys.recipes.detail(recipeId || ""),
		queryFn: () => api.recipes.get(recipeId!),
		enabled: !!recipeId,
	});

	// Initialize ingredients to add when recipe loads
	useEffect(() => {
		if (recipe?.ingredients) {
			setIngredientsToAdd(new Set(recipe.ingredients.map((_, i) => i)));
		}
		// Restore state from watched recipes if exists
		if (recipeId) {
			const watched = getWatchedRecipe(recipeId);
			if (watched) {
				setCheckedIngredients(new Set(watched.checkedIngredients));
				setScaleFactor(watched.scaleFactor);
			}
		}
	}, [recipe, recipeId, getWatchedRecipe]);

	const { data: activeShoppingLists = [] } = useQuery(
		shoppingListsQuery(familyId || "", {
			enabled: !!familyId && addToListDialogOpen,
			select: (lists) => lists.filter(list => list.status === 'active'),
		})
	);



	useEffect(() => {
		if (activeShoppingLists?.length == 0) return

		if (lastShoppingListId != null && activeShoppingLists?.some(list => list.id == lastShoppingListId)) {
			setSelectedListId(lastShoppingListId)
			return
		}

		setSelectedListId(activeShoppingLists ? activeShoppingLists[0].id : "")
	}, [activeShoppingLists, lastShoppingListId, setSelectedListId])

	const addItemsMutation = useMutation({
		mutationFn: async () => {
			if (!selectedListId || !recipe?.ingredients) return;

			const promises = Array.from(ingredientsToAdd).map(index => {
				const ing = recipe.ingredients[index];
				return api.shopping.items.add(selectedListId, {
					name: ing.name,
					quantity: ing.quantity,
					unit: ing.unit,
					category: ing.category,
					sourceRecipeId: recipe.id,
					notes: ing.notes,
				});
			});

			await Promise.all(promises);
		},

		onSuccess: () => {
			setAddToListDialogOpen(false);
			queryClient.invalidateQueries({ queryKey: queryKeys.shopping.lists(familyId || "") });
			// Reset selection
			if (recipe?.ingredients) {
				setIngredientsToAdd(new Set(recipe.ingredients.map((_, i) => i)));
			}
			toast.success("Items added to shopping list");
		},
	});

	const toggleIngredientToAdd = (index: number) => {
		setIngredientsToAdd(prev => {
			const next = new Set(prev);
			if (next.has(index)) {
				next.delete(index);
			} else {
				next.add(index);
			}
			return next;
		});
	};

	const toggleIngredient = (index: number) => {
		setCheckedIngredients(prev => {
			const next = new Set(prev);
			if (next.has(index)) {
				next.delete(index);
			} else {
				next.add(index);
			}
			return next;
		});
		// Track in watched recipes store
		if (recipeId && recipe) {
			watchedToggleIngredient(recipeId, recipe.title, index);
		}
	};

	// Handle scale factor changes
	const handleScaleChange = (newScale: number) => {
		setScaleFactor(newScale);
		if (recipeId && recipe) {
			watchedSetScaleFactor(recipeId, recipe.title, newScale);
		}
	};

	// Toggle watched/minimized status
	const handleToggleWatched = () => {
		if (!recipeId || !recipe) return;
		if (isWatched(recipeId)) {
			removeFromWatched(recipeId);
			toast.info("Recipe unpinned from sidebar");
		} else {
			addToWatched({ id: recipeId, title: recipe.title, explicit: true });
			toast.success("Recipe pinned to sidebar");
		}
	};

	// Format scaled quantity
	const formatScaledQty = (qty: number) => {
		const scaled = qty * scaleFactor;
		// Round to 2 decimal places and remove trailing zeros
		return Number(scaled.toFixed(2)).toString();
	};

	// Toggle ingredient group expansion
	const toggleGroupExpanded = (groupId: string) => {
		setExpandedGroups(prev => {
			const next = new Set(prev);
			if (next.has(groupId)) {
				next.delete(groupId);
			} else {
				next.add(groupId);
			}
			return next;
		});
	};

	// Initialize all groups as expanded when recipe loads
	useEffect(() => {
		if (recipe?.ingredientGroups) {
			setExpandedGroups(new Set(recipe.ingredientGroups.map(g => g.id)));
		}
	}, [recipe?.ingredientGroups]);

	const clearAllChecks = useCallback(() => {
		setCheckedIngredients(new Set());
		// Also clear the instruction heading checks from the DOM
		const checkedBlocks = document.querySelectorAll('.recipe-viewer-checkable .is-checked');
		checkedBlocks.forEach(block => block.classList.remove('is-checked'));
		toast.info("All checks cleared");
	}, []);


	if (!familyId) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Please select a family first</p>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error || !recipe) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-destructive">Failed to load recipe</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageTitle title={recipe.title} />
			{/* Header */}
			<div className="flex items-center justify-between">
				<Button variant="ghost" size="icon" onClick={() => navigate("/recipes")}>
					<ArrowLeft className="w-5 h-5" />
				</Button>
				<div className="flex items-center gap-2">
					<Button
						variant={isWatched(recipeId!) ? "secondary" : "outline"}
						size="sm"
						onClick={handleToggleWatched}
						title={isWatched(recipeId!) ? "Remove from sidebar" : "Pin to sidebar"}
					>
						<Pin className={cn("w-4 h-4", isWatched(recipeId!) && "fill-current")} />
					</Button>
					<Button variant="outline" onClick={() => navigate(`/recipes/${recipeId}/edit`)}>
						<Edit className="w-4 h-4 mr-2" />
						Edit
					</Button>
				</div>
			</div>

			{/* Recipe header */}
			<div>
				{recipe.imageUrl && (
					<div className="aspect-[21/9] w-full overflow-hidden rounded-lg mb-6">
						<img
							src={recipe.imageUrl}
							alt={recipe.title}
							loading="lazy"
							className="w-full h-full object-cover"
						/>
					</div>
				)}
				<h1 className="text-3xl font-bold mb-2">{recipe.title}</h1>
				{recipe.description && (
					<p className="text-lg text-muted-foreground mb-4">{recipe.description}</p>
				)}
				<div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
					{(recipe.prepTimeMinutes || recipe.cookTimeMinutes) ? (
						<div className="flex items-center gap-1">
							<Clock className="w-4 h-4" />
							{recipe.prepTimeMinutes && `${recipe.prepTimeMinutes}m prep`}
							{recipe.prepTimeMinutes && recipe.cookTimeMinutes && ' + '}
							{recipe.cookTimeMinutes && `${recipe.cookTimeMinutes}m cook`}
						</div>
					) : null}
					<div className="flex items-center gap-1">
						<Users className="w-4 h-4" />
						{recipe.servings} servings
						{recipe.yield && <span className="text-muted-foreground ml-1">({recipe.yield})</span>}
					</div>
				</div>
				{recipe.tags.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{(recipe.tags as string[]).map((tag) => (
							<Badge key={tag} variant="secondary">{tag}</Badge>
						))}
					</div>
				)}
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Instructions */}
				<div className="lg:col-span-2">
					<Card>
						<CardHeader>
							<CardTitle>Instructions</CardTitle>
							<p className="text-sm text-muted-foreground">
								Click headings to mark steps complete. Click timers to start them.
							</p>
						</CardHeader>
						<CardContent>
							<RecipeViewer
								key={recipe.id} // Needed to rerender the rich text properly when recipe id changes
								content={recipe.instructions}
								recipeId={recipe.id}
								className="[&_.timer-mention]:cursor-pointer [&_.timer-mention:hover]:scale-105 [&_.timer-mention]:transition-transform"
								onIngredientHover={(name) => setHighlightedIngredientName(name)}
							/>
						</CardContent>
					</Card>
				</div>

				{/* Ingredients sidebar */}
				<div>
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle>Ingredients</CardTitle>
								<div className="flex gap-2">
									<Button
										size="sm"
										variant="ghost"
										onClick={clearAllChecks}
										title="Clear all checks"
									>
										<RotateCcw className="w-4 h-4" />
									</Button>
									<Button
										size="sm"
										variant="outline"
										onClick={() => setAddToListDialogOpen(true)}
									>
										<ShoppingCart className="w-4 h-4 mr-2" />
										Add to List
									</Button>
								</div>
							</div>
							<div className="flex items-center justify-between mt-2">
								<p className="text-sm text-muted-foreground">
									{checkedIngredients.size}/{recipe.ingredients?.length || 0} checked
								</p>
								{/* Scaling controls */}
								<div className="flex items-center gap-1">
									<Button
										size="icon"
										variant="ghost"
										className="h-6 w-6"
										onClick={() => handleScaleChange(Math.max(0.25, scaleFactor - 0.25))}
									>
										<Minus className="w-3 h-3" />
									</Button>
									<span className={cn(
										"text-sm font-medium min-w-[3rem] text-center",
										scaleFactor !== 1 && "text-primary"
									)}>
										{scaleFactor}x
									</span>
									<Button
										size="icon"
										variant="ghost"
										className="h-6 w-6"
										onClick={() => handleScaleChange(scaleFactor + 0.25)}
									>
										<Plus className="w-3 h-3" />
									</Button>
									<div className="w-8 flex justify-center">
										{scaleFactor !== 1 && (
											<Button
												size="icon"
												variant="ghost"
												className="h-6 w-6 text-muted-foreground hover:text-foreground"
												onClick={() => handleScaleChange(1)}
												title="Reset scaling"
											>
												<RotateCcw className="w-3 h-3" />
											</Button>
										)}
									</div>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								{/* Ingredient Groups */}
								{recipe.ingredientGroups?.map((group) => {
									const isExpanded = expandedGroups.has(group.id);
									const groupIngredients = recipe.ingredients?.filter(ing => ing.groupId === group.id) || [];

									return (
										<div key={group.id} className="border rounded-lg overflow-hidden">
											<button
												type="button"
												onClick={() => toggleGroupExpanded(group.id)}
												className="flex items-center gap-2 w-full p-2 bg-muted/50 hover:bg-muted transition-colors text-left"
											>
												{isExpanded ? (
													<ChevronDown className="w-4 h-4" />
												) : (
													<ChevronRight className="w-4 h-4" />
												)}
												<span className="font-medium text-sm">{group.name}</span>
												<span className="text-xs text-muted-foreground ml-auto">
													{groupIngredients.length} items
												</span>
											</button>
											{isExpanded && (
												<div className="p-2 space-y-1">
													{groupIngredients.map((ing) => {
														const originalIndex = recipe.ingredients?.findIndex(i => i.id === ing.id) ?? -1;
														return (
															<div
																key={ing.id}
																className={cn(
																	"flex items-center gap-3 p-2 -mx-2 rounded-md transition-all duration-200",
																	highlightedIngredientName && ing.name.trim().toLowerCase() === highlightedIngredientName.trim().toLowerCase()
																		? "bg-primary/10 ring-1 ring-primary shadow-sm scale-[1.02]"
																		: ""
																)}
															>
																<Checkbox
																	checked={checkedIngredients.has(originalIndex)}
																	onCheckedChange={() => toggleIngredient(originalIndex)}
																/>
																<span className={checkedIngredients.has(originalIndex) ? 'line-through text-muted-foreground' : 'text-sm'}>
																	{ing.quantity && (
																		<span className={scaleFactor !== 1 ? "font-medium text-primary" : ""}>
																			{formatScaledQty(ing.quantity)}{" "}
																		</span>
																	)}
																	{ing.unit && `${ing.unit} `}
																	{ing.name}
																</span>
															</div>
														);
													})}
												</div>
											)}
										</div>
									);
								})}

								{/* Ungrouped Ingredients */}
								{(() => {
									const ungroupedIngredients = recipe.ingredients?.filter(ing => !ing.groupId) || [];
									if (ungroupedIngredients.length === 0 && (recipe.ingredientGroups?.length ?? 0) > 0) return null;

									return (
										<>
											{(recipe.ingredientGroups?.length ?? 0) > 0 && ungroupedIngredients.length > 0 && (
												<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Other</p>
											)}
											{ungroupedIngredients.map((ing) => {
												const index = recipe.ingredients?.findIndex(i => i.id === ing.id) ?? -1;
												return (
													<div
														key={ing.id}
														className={cn(
															"flex items-center gap-3 p-2 -mx-2 rounded-md transition-all duration-200",
															highlightedIngredientName && ing.name.trim().toLowerCase() === highlightedIngredientName.trim().toLowerCase()
																? "bg-primary/10 ring-1 ring-primary shadow-sm scale-[1.02]"
																: ""
														)}
													>
														<Checkbox
															checked={checkedIngredients.has(index)}
															onCheckedChange={() => toggleIngredient(index)}
														/>
														<span className={checkedIngredients.has(index) ? 'line-through text-muted-foreground' : 'text-sm'}>
															{ing.quantity && (
																<span className={scaleFactor !== 1 ? "font-medium text-primary" : ""}>
																	{formatScaledQty(ing.quantity)}{" "}
																</span>
															)}
															{ing.unit && `${ing.unit} `}
															{ing.name}
														</span>
													</div>
												);
											})}
										</>
									);
								})()}

								{(!recipe.ingredients || recipe.ingredients.length === 0) && (
									<p className="text-sm text-muted-foreground text-center py-4">
										No ingredients listed
									</p>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>


			{/* Add to List Dialog */}
			<Dialog open={addToListDialogOpen} onOpenChange={setAddToListDialogOpen}>
				<DialogContent className="max-w-md max-h-[80vh] flex flex-col">
					<DialogHeader>
						<DialogTitle>Add to Shopping List</DialogTitle>
					</DialogHeader>

					<div className="space-y-4 overflow-y-auto flex-1 p-1">
						<div className="space-y-2">
							<label className="text-sm font-medium">Select List</label>
							<select
								className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
								value={selectedListId}
								onChange={(e) => {
									const id = e.target.value;
									setSelectedListId(id);
									setLastShoppingListId(id);
								}}
							>
								<option value="" disabled>Select a shopping list</option>
								{activeShoppingLists.map(list => (
									<option key={list.id} value={list.id}>{list.name}</option>
								))}
							</select>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium">Select Ingredients</label>
							<div className="border rounded-md p-2 space-y-2">

								<div className="flex items-center gap-2 pb-2 border-b">
									<Checkbox
										checked={ingredientsToAdd.size === (recipe?.ingredients?.length || 0)}
										onCheckedChange={(checked) => {
											if (checked) {
												setIngredientsToAdd(new Set(recipe?.ingredients?.map((_, i) => i)));
											} else {
												setIngredientsToAdd(new Set());
											}
										}}
									/>
									<span className="text-sm font-medium">Select All</span>
								</div>

								{recipe?.ingredients?.map((ing, index) => (
									<div key={ing.id} className="flex items-center gap-3">
										<Checkbox
											checked={ingredientsToAdd.has(index)}
											onCheckedChange={() => toggleIngredientToAdd(index)}
										/>
										<span className="text-sm">
											{ing.quantity} {ing.unit} {ing.name}
										</span>
									</div>
								))}
							</div>
						</div>
					</div>

					<div className="flex justify-end gap-2 pt-4 border-t mt-2">
						<Button variant="outline" onClick={() => setAddToListDialogOpen(false)}>Cancel</Button>
						<Button
							onClick={() => addItemsMutation.mutate()}
							disabled={!selectedListId || ingredientsToAdd.size === 0 || addItemsMutation.isPending}
						>
							{addItemsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
							Add Items
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
