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
import { ArrowLeft, Loader2, Clock, Users, Edit, ShoppingCart, Play, Pause, RotateCcw } from "lucide-react";
import { useCurrentFamilyId } from "@/components/auth-provider";
import { api, type RecipeResponse } from "@/lib/api";
import { queryKeys, shoppingListsQuery } from "@/lib/queries";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

interface ActiveTimer {
	id: string;
	duration: string;
	durationMs: number;
	remainingMs: number;
	isRunning: boolean;
}

export function RecipeDetailPage() {
	const { recipeId } = useParams<{ recipeId: string }>();
	const navigate = useNavigate();
	const familyId = useCurrentFamilyId();
	const queryClient = useQueryClient();

	const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
	const [checkedSteps, setCheckedSteps] = useState<Set<string>>(new Set());
	const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
	const [addToListDialogOpen, setAddToListDialogOpen] = useState(false);

	const { lastShoppingListId, setLastShoppingListId } = useAppStore();
	const [selectedListId, setSelectedListId] = useState<string>("");
	const [ingredientsToAdd, setIngredientsToAdd] = useState<Set<number>>(new Set());
	const [timerDialogOpen, setTimerDialogOpen] = useState(false);

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
	}, [recipe]);

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

	// Timer tick
	useEffect(() => {
		const interval = setInterval(() => {
			setActiveTimers(prev =>
				prev.map(timer => {
					if (!timer.isRunning || timer.remainingMs <= 0) return timer;
					const newRemaining = Math.max(0, timer.remainingMs - 1000);
					if (newRemaining === 0) {
						// Timer finished - could trigger notification here
						if ('Notification' in window && Notification.permission === 'granted') {
							new Notification('Timer Complete!', {
								body: `${timer.duration} timer has finished`,
								icon: '/vite.svg',
							});
						}
					}
					return { ...timer, remainingMs: newRemaining };
				})
			);
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	// Handle timer button clicks in rendered content
	useEffect(() => {
		const handleTimerClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (target.classList.contains('timer-mention') || target.closest('.timer-mention')) {
				const button = (target.classList.contains('timer-mention') ? target : target.closest('.timer-mention')) as HTMLElement;
				const duration = button.dataset.timer;
				const durationMs = parseInt(button.dataset.timerMs || '60000');

				if (duration) {
					// Add or focus timer
					const existingTimer = activeTimers.find(t => t.duration === duration);
					if (!existingTimer) {
						setActiveTimers(prev => [...prev, {
							id: `${duration}-${Date.now()}`,
							duration,
							durationMs,
							remainingMs: durationMs,
							isRunning: false,
						}]);
					}
					setTimerDialogOpen(true);
				}
			}
		};

		document.addEventListener('click', handleTimerClick);
		return () => document.removeEventListener('click', handleTimerClick);
	}, [activeTimers]);

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
	};

	const toggleStep = (stepId: string) => {
		setCheckedSteps(prev => {
			const next = new Set(prev);
			if (next.has(stepId)) {
				next.delete(stepId);
			} else {
				next.add(stepId);
			}
			return next;
		});
	};

	const toggleTimer = (timerId: string) => {
		setActiveTimers(prev =>
			prev.map(t => t.id === timerId ? { ...t, isRunning: !t.isRunning } : t)
		);
	};

	const resetTimer = (timerId: string) => {
		setActiveTimers(prev =>
			prev.map(t => t.id === timerId ? { ...t, remainingMs: t.durationMs, isRunning: false } : t)
		);
	};

	const removeTimer = (timerId: string) => {
		setActiveTimers(prev => prev.filter(t => t.id !== timerId));
	};

	const formatTime = (ms: number) => {
		const totalSeconds = Math.floor(ms / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		}
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	};

	// Process instructions to add interactive elements
	const processInstructions = (html: string) => {
		// Add click handlers to headings to make them checkable
		let processed = html.replace(/<h([23])([^>]*)>(.*?)<\/h\1>/g, (match, level, attrs, content) => {
			const stepId = `heading-${content.slice(0, 20).replace(/\W/g, '-')}`;
			const isChecked = checkedSteps.has(stepId);
			return `
        <div class="flex items-start gap-3 my-4 group cursor-pointer step-heading" data-step-id="${stepId}">
          <div class="mt-1 w-5 h-5 rounded border-2 border-primary flex items-center justify-center shrink-0 ${isChecked ? 'bg-primary' : ''}">
            ${isChecked ? '<svg class="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>' : ''}
          </div>
          <h${level} class="${isChecked ? 'line-through text-muted-foreground' : ''}"${attrs}>${content}</h${level}>
        </div>
      `;
		});

		return processed;
	};

	// Handle step heading clicks
	useEffect(() => {
		const handleStepClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			const stepHeading = target.closest('.step-heading') as HTMLElement;
			if (stepHeading) {
				const stepId = stepHeading.dataset.stepId;
				if (stepId) {
					toggleStep(stepId);
				}
			}
		};

		document.addEventListener('click', handleStepClick);
		return () => document.removeEventListener('click', handleStepClick);
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
			{/* Header */}
			<div className="flex items-center justify-between">
				<Button variant="ghost" size="icon" onClick={() => navigate("/recipes")}>
					<ArrowLeft className="w-5 h-5" />
				</Button>
				<div className="flex items-center gap-2">
					{activeTimers.length > 0 && (
						<Button variant="outline" onClick={() => setTimerDialogOpen(true)}>
							<Clock className="w-4 h-4 mr-2" />
							{activeTimers.filter(t => t.isRunning).length} Active
						</Button>
					)}
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
							className="w-full h-full object-cover"
						/>
					</div>
				)}
				<h1 className="text-3xl font-bold mb-2">{recipe.title}</h1>
				{recipe.description && (
					<p className="text-lg text-muted-foreground mb-4">{recipe.description}</p>
				)}
				<div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
					{(recipe.prepTimeMinutes || recipe.cookTimeMinutes) && (
						<div className="flex items-center gap-1">
							<Clock className="w-4 h-4" />
							{recipe.prepTimeMinutes && `${recipe.prepTimeMinutes}m prep`}
							{recipe.prepTimeMinutes && recipe.cookTimeMinutes && ' + '}
							{recipe.cookTimeMinutes && `${recipe.cookTimeMinutes}m cook`}
						</div>
					)}
					<div className="flex items-center gap-1">
						<Users className="w-4 h-4" />
						{recipe.servings} servings
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
							<div
								className="prose prose-sm max-w-none
                  prose-headings:font-semibold prose-headings:text-foreground
                  prose-p:text-foreground prose-p:leading-relaxed
                  [&_.timer-mention]:cursor-pointer [&_.timer-mention:hover]:scale-105 [&_.timer-mention]:transition-transform"
								dangerouslySetInnerHTML={{ __html: processInstructions(recipe.instructions) }}
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
								<Button
									size="sm"
									variant="outline"
									onClick={() => setAddToListDialogOpen(true)}
								>
									<ShoppingCart className="w-4 h-4 mr-2" />
									Add to List
								</Button>
							</div>
							<p className="text-sm text-muted-foreground">
								{checkedIngredients.size}/{recipe.ingredients?.length || 0} checked
							</p>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								{recipe.ingredients?.map((ing, index) => (
									<div key={ing.id} className="flex items-center gap-3">
										<Checkbox
											checked={checkedIngredients.has(index)}
											onCheckedChange={() => toggleIngredient(index)}
										/>
										<span className={checkedIngredients.has(index) ? 'line-through text-muted-foreground' : ''}>
											{ing.quantity && `${ing.quantity} `}
											{ing.unit && `${ing.unit} `}
											{ing.name}
										</span>
									</div>
								))}
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

			{/* Timer Dialog */}
			<Dialog open={timerDialogOpen} onOpenChange={setTimerDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Timers</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						{activeTimers.length === 0 ? (
							<p className="text-center text-muted-foreground py-4">
								Click a timer in the recipe to add it here
							</p>
						) : (
							activeTimers.map((timer) => (
								<div key={timer.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
									<div className="flex-1">
										<p className="text-sm text-muted-foreground">{timer.duration}</p>
										<p className={`text-3xl font-mono ${timer.remainingMs === 0 ? 'text-primary animate-pulse' : ''}`}>
											{formatTime(timer.remainingMs)}
										</p>
									</div>
									<div className="flex gap-2">
										<Button
											size="icon"
											variant={timer.isRunning ? "outline" : "default"}
											onClick={() => toggleTimer(timer.id)}
										>
											{timer.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
										</Button>
										<Button
											size="icon"
											variant="outline"
											onClick={() => resetTimer(timer.id)}
										>
											<RotateCcw className="w-4 h-4" />
										</Button>
									</div>
								</div>
							))
						)}
					</div>
				</DialogContent>
			</Dialog>

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
