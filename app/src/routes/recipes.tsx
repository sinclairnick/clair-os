import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useQueryState, parseAsString, parseAsInteger, parseAsArrayOf } from 'nuqs';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuCheckboxItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Plus,
	Clock,
	Users,
	Loader2,
	Search,
	Filter,
	X,
	Upload,
	Trash2,
	CheckCircle2,
	ListChecks,
	ArrowUpDown,
	SlidersHorizontal,
	ChevronDown
} from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useCurrentFamilyId } from "@/components/auth-provider";
import { recipesQuery, queryKeys } from "@/lib/queries";
import { RecipeImportDialog } from "@/components/recipe-import-dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function RecipesPage() {
	const navigate = useNavigate();
	const familyId = useCurrentFamilyId();
	const queryClient = useQueryClient();

	// Server-side filter states using nuqs
	const [search, setSearch] = useQueryState('search', parseAsString.withDefault('').withOptions({ throttleMs: 500, history: 'replace', shallow: false }));
	const [sort, setSort] = useQueryState('sort', parseAsString.withDefault('createdAt'));
	const [order, setOrder] = useQueryState('order', parseAsString.withDefault('desc'));
	const [minServings, setMinServings] = useQueryState('minServings', parseAsInteger);
	const [maxServings, setMaxServings] = useQueryState('maxServings', parseAsInteger);
	const [maxTime, setMaxTime] = useQueryState('maxTime', parseAsInteger);

	// Client-side filter states
	const [selectedTags, setSelectedTags] = useQueryState('tags', parseAsArrayOf(parseAsString).withDefault([]));
	const [selectionMode, setSelectionMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	const { data: recipes, isLoading, error } = useQuery(
		recipesQuery(
			familyId || "",
			{
				search,
				sort,
				order: order as 'asc' | 'desc',
				minServings: minServings ?? undefined,
				maxServings: maxServings ?? undefined,
				maxTime: maxTime ?? undefined,
			},
			{
				enabled: !!familyId,
			}
		)
	);

	// Get all unique tags from recipes (client-side aggregation of current page results)
	const allTags = useMemo(() => {
		if (!recipes) return [];
		const tagSet = new Set<string>();
		recipes.forEach((recipe) => {
			(recipe.tags as string[]).forEach((tag) => tagSet.add(tag));
		});
		return Array.from(tagSet).sort();
	}, [recipes]);

	// Filter recipes based on tags (client-side)
	const filteredRecipes = useMemo(() => {
		if (!recipes) return [];
		if (selectedTags.length === 0) return recipes;

		return recipes.filter((recipe) => {
			return selectedTags.every((tag) => (recipe.tags as string[]).includes(tag));
		});
	}, [recipes, selectedTags]);

	const bulkDeleteMutation = useMutation({
		mutationFn: async (ids: string[]) => {
			// Sequential deletion to maintain permission checks
			for (const id of ids) {
				await api.recipes.delete(id);
			}
		},
		onSuccess: () => {
			if (familyId) {
				queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all(familyId) });
			}
			toast.success(`${selectedIds.size} recipes deleted`);
			setSelectionMode(false);
			setSelectedIds(new Set());
		},
		onError: () => {
			toast.error("Failed to delete some recipes");
		}
	});

	const toggleTag = (tag: string) => {
		setSelectedTags((prev) =>
			prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
		);
	};

	const clearFilters = () => {
		setSearch(null);
		setSelectedTags(null);
		setMinServings(null);
		setMaxServings(null);
		setMaxTime(null);
		setSort(null);
		setOrder(null);
	};

	const toggleSelection = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const selectAll = () => {
		const allIds = filteredRecipes.map(r => r.id);
		setSelectedIds(new Set(allIds));
	};

	const deselectAll = () => {
		setSelectedIds(new Set());
	};

	const handleBulkDelete = () => {
		if (selectedIds.size === 0) return;
		if (window.confirm(`Are you sure you want to delete ${selectedIds.size} recipes?`)) {
			bulkDeleteMutation.mutate(Array.from(selectedIds));
		}
	};

	if (!familyId) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Please select a family first</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Recipes</h1>
					<p className="text-muted-foreground">Your family's recipe collection</p>
				</div>
				<div className="flex items-center gap-2">
					{selectionMode ? (
						<>
							<Button variant="ghost" onClick={() => {
								setSelectionMode(false);
								setSelectedIds(new Set());
							}}>
								Cancel
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger>
									<Button variant="outline">
										<ListChecks className="w-4 h-4 mr-2" />
										Selection
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuCheckboxItem
										checked={selectedIds.size === filteredRecipes.length && filteredRecipes.length > 0}
										onCheckedChange={() => {
											selectedIds.size === filteredRecipes.length ? deselectAll() : selectAll();
										}}
									>
										{selectedIds.size === filteredRecipes.length ? "Deselect All" : "Select All"}
									</DropdownMenuCheckboxItem>
								</DropdownMenuContent>
							</DropdownMenu>
							<Button
								variant="destructive"
								onClick={handleBulkDelete}
								disabled={selectedIds.size === 0 || bulkDeleteMutation.isPending}
							>
								{bulkDeleteMutation.isPending ? (
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								) : (
									<Trash2 className="w-4 h-4 mr-2" />
								)}
								Delete ({selectedIds.size})
							</Button>
						</>
					) : (
						<>
							<Button variant="outline" onClick={() => setSelectionMode(true)}>
								<CheckCircle2 className="w-4 h-4 mr-2" />
								Select
							</Button>
							<RecipeImportDialog
								trigger={
									<Button variant="outline">
										<Upload className="w-4 h-4 mr-2" />
										Import
									</Button>
								}
							/>
							<Button onClick={() => navigate("/recipes/new")}>
								<Plus className="w-4 h-4 mr-2" />
								Add Recipe
							</Button>
						</>
					)}
				</div>
			</div>

			{/* Search and Filter */}
			{!selectionMode && (
				<div className="flex flex-col sm:flex-row gap-3">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
						<Input
							placeholder="Search recipes..."
							value={search || ''}
							onChange={(e) => setSearch(e.target.value || null)}
							className="pl-9"
						/>
						{search && (
							<button
								onClick={() => setSearch(null)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							>
								<X className="w-4 h-4" />
							</button>
						)}
					</div>

					{/* Sort Dropdown */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline">
								<ArrowUpDown className="w-4 h-4 mr-2" />
								Sort
								<ChevronDown className="w-3 h-3 ml-2 opacity-50" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuCheckboxItem checked={sort === 'createdAt'} onCheckedChange={() => setSort('createdAt')}>
								Newest First
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem checked={sort === 'title'} onCheckedChange={() => setSort('title')}>
								Alphabetical
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem checked={sort === 'totalTime'} onCheckedChange={() => setSort('totalTime')}>
								Total Time
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem checked={sort === 'ingredientCount'} onCheckedChange={() => setSort('ingredientCount')}>
								Ingredient Count
							</DropdownMenuCheckboxItem>
							<div className="border-t my-1" />
							<DropdownMenuCheckboxItem checked={order === 'asc'} onCheckedChange={() => setOrder('asc')}>
								Ascending
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem checked={order === 'desc'} onCheckedChange={() => setOrder('desc')}>
								Descending
							</DropdownMenuCheckboxItem>
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Filters Popover */}
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline">
								<SlidersHorizontal className="w-4 h-4 mr-2" />
								Filters
								{(minServings || maxServings || maxTime) && (
									<Badge variant="secondary" className="ml-2 bg-primary/20">
										Active
									</Badge>
								)}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-80" align="end">
							<div className="grid gap-4">
								<div className="space-y-2">
									<h4 className="font-medium leading-none">Filters</h4>
									<p className="text-sm text-muted-foreground">
										Refine your recipe list
									</p>
								</div>
								<div className="grid gap-4">
									<div className="grid gap-2">
										<Label>Servings</Label>
										<div className="flex items-center gap-2">
											<Input
												type="number"
												placeholder="Min"
												className="h-8"
												value={minServings ?? ''}
												onChange={e => setMinServings(e.target.value ? Number(e.target.value) : null)}
											/>
											<span className="text-muted-foreground">-</span>
											<Input
												type="number"
												placeholder="Max"
												className="h-8"
												value={maxServings ?? ''}
												onChange={e => setMaxServings(e.target.value ? Number(e.target.value) : null)}
											/>
										</div>
									</div>
									<div className="grid gap-2">
										<Label>Max Time (minutes)</Label>
										<Input
											type="number"
											className="h-8"
											placeholder="e.g. 60"
											value={maxTime ?? ''}
											onChange={e => setMaxTime(e.target.value ? Number(e.target.value) : null)}
										/>
									</div>
								</div>
							</div>
						</PopoverContent>
					</Popover>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline">
								<Filter className="w-4 h-4 mr-2" />
								Tags
								{selectedTags.length > 0 && (
									<Badge variant="secondary" className="ml-2">
										{selectedTags.length}
									</Badge>
								)}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							{allTags.length === 0 ? (
								<p className="text-sm text-muted-foreground p-2">No tags yet</p>
							) : (
								allTags.map((tag) => (
									<DropdownMenuCheckboxItem
										key={tag}
										checked={selectedTags.includes(tag)}
										onCheckedChange={() => toggleTag(tag)}
									>
										{tag}
									</DropdownMenuCheckboxItem>
								))
							)}
						</DropdownMenuContent>
					</DropdownMenu>
					{(search || selectedTags.length > 0 || minServings || maxServings || maxTime || sort !== 'createdAt') && (
						<Button variant="ghost" onClick={clearFilters}>
							Clear
						</Button>
					)}
				</div>
			)}

			{/* Selection active info */}
			{selectionMode && (
				<div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between text-sm">
					<div className="flex items-center gap-2 font-medium">
						<ListChecks className="w-4 h-4" />
						{selectedIds.size} recipes selected
					</div>
					<div className="flex gap-2">
						<Button size="sm" variant="ghost" onClick={selectAll}>Select All</Button>
						<Button size="sm" variant="ghost" onClick={deselectAll}>Deselect All</Button>
					</div>
				</div>
			)}

			{/* Active filters */}
			{!selectionMode && selectedTags.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{selectedTags.map((tag) => (
						<Badge
							key={tag}
							variant="secondary"
							className="cursor-pointer"
							onClick={() => toggleTag(tag)}
						>
							{tag}
							<X className="w-3 h-3 ml-1" />
						</Badge>
					))}
				</div>
			)}

			{isLoading && (
				<div className="flex items-center justify-center h-64">
					<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
				</div>
			)}

			{error && (
				<Card className="border-destructive">
					<CardContent className="pt-6">
						<p className="text-destructive">Failed to load recipes: {error.message}</p>
					</CardContent>
				</Card>
			)}

			{recipes && recipes.length === 0 && (
				<Card>
					<CardHeader>
						<CardTitle>No recipes yet</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							Add your first recipe to get started. You can add ingredients,
							instructions, and link recipes to shopping lists and meal plans.
						</p>
					</CardContent>
				</Card>
			)}

			{recipes && recipes.length > 0 && filteredRecipes.length === 0 && (
				<Card>
					<CardContent className="pt-6 text-center">
						<p className="text-muted-foreground">No recipes match your filters</p>
						<Button variant="link" onClick={clearFilters}>
							Clear filters
						</Button>
					</CardContent>
				</Card>
			)}

			{filteredRecipes.length > 0 && (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filteredRecipes.map((recipe) => (
						<Card
							key={recipe.id}
							className={cn(
								"hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden",
								{
									"pt-0": recipe.imageUrl != null,
									"ring-2 ring-primary border-primary":
										selectionMode && selectedIds.has(recipe.id)
								}
							)}
							onClick={() => {
								if (selectionMode) {
									toggleSelection(recipe.id);
								} else {
									navigate(`/recipes/${recipe.id}`, { viewTransition: true });
								}
							}}
						>
							{selectionMode && (
								<div className="absolute top-2 left-2 z-10">
									{selectedIds.has(recipe.id) ? (
										<CheckCircle2 className="w-6 h-6 text-primary fill-background" />
									) : (
										<div className="w-6 h-6 rounded-full border-2 border-primary/20 bg-background" />
									)}
								</div>
							)}

							{recipe.imageUrl && (
								<div className="aspect-video w-full overflow-hidden rounded-t-lg">
									<img
										src={recipe.imageUrl}
										alt={recipe.title}
										className="w-full h-full object-cover group-hover:scale-105 transition-transform"
									/>
								</div>
							)}
							<CardHeader className="pb-2">
								<CardTitle className="text-lg">{recipe.title}</CardTitle>
							</CardHeader>
							<CardContent>
								{recipe.description && (
									<p className="text-sm text-muted-foreground line-clamp-2 mb-3">
										{recipe.description}
									</p>
								)}
								<div className="flex items-center gap-4 text-xs text-muted-foreground">
									{(recipe.prepTimeMinutes || recipe.cookTimeMinutes) ? (
										<div className="flex items-center gap-1">
											<Clock className="w-3 h-3" />
											{(recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)} min
										</div>
									) : null}
									<div className="flex items-center gap-1">
										<Users className="w-3 h-3" />
										{recipe.servings} servings
										{recipe.yield && <span className="opacity-70 ml-0.5">({recipe.yield})</span>}
									</div>
								</div>
								{(recipe.tags as string[]).length > 0 && (
									<div className="flex flex-wrap gap-1 mt-3">
										{(recipe.tags as string[]).slice(0, 3).map((tag) => (
											<span
												key={tag}
												className="px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground"
											>
												{tag}
											</span>
										))}
										{(recipe.tags as string[]).length > 3 && (
											<span className="text-xs text-muted-foreground">
												+{(recipe.tags as string[]).length - 3}
											</span>
										)}
									</div>
								)}
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

