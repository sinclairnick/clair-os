import { useState, useMemo, useEffect } from "react";
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
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
	Plus,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { useCurrentFamilyId } from "@/components/auth-provider";
import { recipesQuery, queryKeys } from "@/lib/queries";
import { RecipeImportDialog } from "@/components/recipe-import-dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { PageTitle } from "@/components/page-title";
import { PageHeader, PageHeaderHeading, PageHeaderActions } from "@/components/page-header";
import { useDebounce } from "@/hooks/use-debounce";
import { RecipeCard } from "@/components/recipe-card";

export function RecipesPage() {
	const navigate = useNavigate();
	const familyId = useCurrentFamilyId();
	const queryClient = useQueryClient();

	// Server-side filter states using nuqs
	const [search, setSearch] = useQueryState('search', parseAsString.withDefault('').withOptions({ history: 'replace', shallow: false }));
	const [internalSearch, setInternalSearch] = useState(search);
	const debouncedSearch = useDebounce(internalSearch, 300);

	useEffect(() => {
		setSearch(debouncedSearch || null);
	}, [debouncedSearch, setSearch]);

	// Sync internal search when the URL state changes (e.g. clear filters)
	useEffect(() => {
		setInternalSearch(search);
	}, [search]);
	const [sort, setSort] = useQueryState('sort', parseAsString.withDefault('createdAt'));
	const [order, setOrder] = useQueryState('order', parseAsString.withDefault('desc'));
	const [minServings, setMinServings] = useQueryState('minServings', parseAsInteger);
	const [maxServings, setMaxServings] = useQueryState('maxServings', parseAsInteger);
	const [maxTime, setMaxTime] = useQueryState('maxTime', parseAsInteger);

	// Client-side filter states
	const [selectedTags, setSelectedTags] = useQueryState('tags', parseAsArrayOf(parseAsString).withDefault([]));
	const [selectionMode, setSelectionMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	// Mobile filters sheet state
	const [isFiltersOpen, setIsFiltersOpen] = useState(false);

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

	const toggleFavoriteMutation = useMutation({
		mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
			api.recipes.toggleFavorite(id, favorite),
		onSuccess: (_, { id }) => {
			if (familyId) {
				queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all(familyId) });
				queryClient.invalidateQueries({ queryKey: queryKeys.recipes.detail(id) });
				queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary(familyId) });
			}
		},
		onError: () => {
			toast.error("Failed to update favorite status");
		}
	});

	const toggleTag = (tag: string) => {
		setSelectedTags((prev) =>
			prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
		);
	};

	const clearFilters = () => {
		setInternalSearch('');
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

	const activeFilterCount = (
		(minServings !== null ? 1 : 0) +
		(maxServings !== null ? 1 : 0) +
		(maxTime !== null ? 1 : 0) +
		selectedTags.length
	);


	// Helper components for Filters to reuse between Desktop (Inline) and Mobile (Sheet)
	const SortOptions = () => (
		<>
			<Label className="mb-2 block md:hidden">Sort By</Label>
			<div className="flex flex-col gap-2 md:flex-row md:items-center">
				<Button
					variant={sort === 'createdAt' ? "secondary" : "ghost"}
					size="sm"
					className="justify-start"
					onClick={() => setSort('createdAt')}
				>
					Newest First
				</Button>
				<Button
					variant={sort === 'title' ? "secondary" : "ghost"}
					size="sm"
					className="justify-start"
					onClick={() => setSort('title')}
				>
					Alphabetical
				</Button>
				<Button
					variant={sort === 'totalTime' ? "secondary" : "ghost"}
					size="sm"
					className="justify-start"
					onClick={() => setSort('totalTime')}
				>
					Total Time
				</Button>
				<Button
					variant={sort === 'ingredientCount' ? "secondary" : "ghost"}
					size="sm"
					className="justify-start"
					onClick={() => setSort('ingredientCount')}
				>
					Ingredient Count
				</Button>
				<div className="h-px bg-border my-2 md:hidden" />
				<Button
					variant={order === 'asc' ? "secondary" : "ghost"}
					size="sm"
					className="justify-start"
					onClick={() => setOrder('asc')}
				>
					Ascending
				</Button>
				<Button
					variant={order === 'desc' ? "secondary" : "ghost"}
					size="sm"
					className="justify-start"
					onClick={() => setOrder('desc')}
				>
					Descending
				</Button>
			</div>
		</>
	);

	const ServingTimeFilters = () => (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label>Servings</Label>
				<div className="flex items-center gap-2">
					<Input
						type="number"
						placeholder="Min"
						className="h-9"
						value={minServings ?? ''}
						onChange={e => setMinServings(e.target.value ? Number(e.target.value) : null)}
					/>
					<span className="text-muted-foreground">-</span>
					<Input
						type="number"
						placeholder="Max"
						className="h-9"
						value={maxServings ?? ''}
						onChange={e => setMaxServings(e.target.value ? Number(e.target.value) : null)}
					/>
				</div>
			</div>
			<div className="space-y-2">
				<Label>Max Time (minutes)</Label>
				<Input
					type="number"
					className="h-9"
					placeholder="e.g. 60"
					value={maxTime ?? ''}
					onChange={e => setMaxTime(e.target.value ? Number(e.target.value) : null)}
				/>
			</div>
		</div>
	);

	const TagFilters = () => (
		<div className="space-y-2">
			<Label>Tags</Label>
			{allTags.length === 0 ? (
				<p className="text-sm text-muted-foreground">No tags available</p>
			) : (
				<div className="flex flex-wrap gap-2">
					{allTags.map((tag) => (
						<Badge
							key={tag}
							variant={selectedTags.includes(tag) ? "default" : "outline"}
							className="cursor-pointer"
							onClick={() => toggleTag(tag)}
						>
							{tag}
						</Badge>
					))}
				</div>
			)}
		</div>
	);


	if (!familyId) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Please select a family first</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageTitle title="Recipes" />
			<PageHeader>
				<PageHeaderHeading title="Recipes" description="Your family's recipe collection" />
				<PageHeaderActions>
					{selectionMode ? (
						<>
							<Button variant="ghost" onClick={() => {
								setSelectionMode(false);
								setSelectedIds(new Set());
							}}>
								Cancel
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger render={
									<Button variant="outline" className="w-full">
										<ListChecks className="w-4 h-4 mr-2" />
										Selection
									</Button>
								}>
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
									<Button variant="outline" className="w-full">
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
				</PageHeaderActions>
			</PageHeader>

			{/* Search and Filter */}
			{!selectionMode && (
				<div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 -mx-4 px-4 md:static md:bg-transparent md:backdrop-blur-none md:p-0 md:m-0">
					<div className="flex gap-2">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
							<Input
								placeholder="Search recipes..."
								value={internalSearch || ''}
								onChange={(e) => setInternalSearch(e.target.value)}
								className="!pl-9 bg-background"
							/>
							{internalSearch && (
								<button
									onClick={() => setInternalSearch('')}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								>
									<X className="w-4 h-4" />
								</button>
							)}
						</div>

						{/* Mobile Filters Trigger */}
						<div className="md:hidden">
							<Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
								<SheetTrigger render={
									<Button variant="outline" size="icon" className="relative shrink-0">
										<SlidersHorizontal className="w-4 h-4" />
										{activeFilterCount > 0 && (
											<span className="absolute -top-1 -right-1 flex h-3 w-3">
												<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
												<span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
											</span>
										)}
									</Button>
								}>
								</SheetTrigger>
								<SheetContent side="right" className="w-[85vw] sm:w-[540px] overflow-y-auto">
									<SheetHeader>
										<SheetTitle>Filters & Sort</SheetTitle>
										<SheetDescription>
											Refine your recipe list
										</SheetDescription>
									</SheetHeader>
									<div className="flex flex-col gap-6 p-4">
										<div>
											<ServingTimeFilters />
										</div>
										<div className="h-px bg-border" />
										<div>
											<TagFilters />
										</div>
										<div className="h-px bg-border" />
										<div>
											<SortOptions />
										</div>
										<Button
											onClick={() => setIsFiltersOpen(false)}
											className="mt-4"
										>
											View Results
										</Button>
									</div>
								</SheetContent>
							</Sheet>
						</div>

						{/* Desktop Filters */}
						<div className="hidden md:flex gap-2">
							<DropdownMenu>
								<DropdownMenuTrigger render={
									<Button variant="outline">
										<ArrowUpDown className="w-4 h-4 mr-2" />
										Sort
										<ChevronDown className="w-3 h-3 ml-2 opacity-50" />
									</Button>
								}>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-48">
									<DropdownMenuLabel>Sort By</DropdownMenuLabel>
									<DropdownMenuSeparator />
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
									<DropdownMenuSeparator />
									<DropdownMenuLabel>Order</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuCheckboxItem checked={order === 'asc'} onCheckedChange={() => setOrder('asc')}>
										Ascending
									</DropdownMenuCheckboxItem>
									<DropdownMenuCheckboxItem checked={order === 'desc'} onCheckedChange={() => setOrder('desc')}>
										Descending
									</DropdownMenuCheckboxItem>
								</DropdownMenuContent>
							</DropdownMenu>

							<Popover>
								<PopoverTrigger render={
									<Button variant="outline">
										<SlidersHorizontal className="w-4 h-4 mr-2" />
										Filters
										{(minServings || maxServings || maxTime) && (
											<Badge variant="secondary" className="ml-2 bg-primary/20">
												Active
											</Badge>
										)}
									</Button>
								}>
								</PopoverTrigger>
								<PopoverContent className="w-80" align="end">
									<div className="grid gap-4">
										<div className="space-y-2">
											<h4 className="font-medium leading-none">Filters</h4>
											<p className="text-sm text-muted-foreground mr-2">
												Refine your recipe list
											</p>
										</div>
										<ServingTimeFilters />
									</div>
								</PopoverContent>
							</Popover>

							<DropdownMenu>
								<DropdownMenuTrigger render={
									<Button variant="outline">
										<Filter className="w-4 h-4 mr-2" />
										Tags
										{selectedTags.length > 0 && (
											<Badge variant="secondary" className="ml-2">
												{selectedTags.length}
											</Badge>
										)}
									</Button>
								}>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-56">
									<DropdownMenuLabel>Filter by Tags</DropdownMenuLabel>
									<DropdownMenuSeparator />
									{allTags.length === 0 ? (
										<div className="p-2 text-sm text-muted-foreground">No tags available</div>
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
					</div>
				</div>
			)}

			{/* Selection active info */}
			{selectionMode && (
				<div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between text-sm sticky top-0 z-10 backdrop-blur">
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

			{/* Active filters display (both mobile and desktop) */}
			{!selectionMode && (
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
					{minServings && (
						<Badge variant="outline" className="gap-1">
							Min Servings: {minServings}
							<X className="w-3 h-3 cursor-pointer" onClick={() => setMinServings(null)} />
						</Badge>
					)}
					{maxServings && (
						<Badge variant="outline" className="gap-1">
							Max Servings: {maxServings}
							<X className="w-3 h-3 cursor-pointer" onClick={() => setMaxServings(null)} />
						</Badge>
					)}
					{maxTime && (
						<Badge variant="outline" className="gap-1">
							Max Time: {maxTime}m
							<X className="w-3 h-3 cursor-pointer" onClick={() => setMaxTime(null)} />
						</Badge>
					)}
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
						<RecipeCard
							key={recipe.id}
							recipe={recipe}
							selectionMode={selectionMode}
							isSelected={selectedIds.has(recipe.id)}
							onFavoriteToggle={(id, favorite) => toggleFavoriteMutation.mutate({ id, favorite })}
							onClick={(recipe) => {
								if (selectionMode) {
									toggleSelection(recipe.id);
								} else {
									navigate(`/recipes/${recipe.id}`, { viewTransition: true });
								}
							}}
						/>
					))}
				</div>
			)}
		</div>
	);
}
