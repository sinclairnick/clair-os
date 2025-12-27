import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
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
import { Plus, Clock, Users, Loader2, Search, Filter, X } from "lucide-react";
import { useCurrentFamilyId } from "@/components/auth-provider";
import { recipesQuery, queryKeys } from "@/lib/queries";

export function RecipesPage() {
	const navigate = useNavigate();
	const familyId = useCurrentFamilyId();
	const queryClient = useQueryClient();
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTags, setSelectedTags] = useState<string[]>([]);

	const { data: recipes, isLoading, error } = useQuery(
		recipesQuery(familyId || "", {
			enabled: !!familyId,
		})
	);

	// Get all unique tags from recipes
	const allTags = useMemo(() => {
		if (!recipes) return [];
		const tagSet = new Set<string>();
		recipes.forEach((recipe) => {
			(recipe.tags as string[]).forEach((tag) => tagSet.add(tag));
		});
		return Array.from(tagSet).sort();
	}, [recipes]);

	// Filter recipes based on search and tags
	const filteredRecipes = useMemo(() => {
		if (!recipes) return [];
		return recipes.filter((recipe) => {
			// Search filter
			const matchesSearch =
				searchQuery === "" ||
				recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(recipe.tags as string[]).some((tag) =>
					tag.toLowerCase().includes(searchQuery.toLowerCase())
				);

			// Tag filter
			const matchesTags =
				selectedTags.length === 0 ||
				selectedTags.every((tag) => (recipe.tags as string[]).includes(tag));

			return matchesSearch && matchesTags;
		});
	}, [recipes, searchQuery, selectedTags]);

	const toggleTag = (tag: string) => {
		setSelectedTags((prev) =>
			prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
		);
	};

	const clearFilters = () => {
		setSearchQuery("");
		setSelectedTags([]);
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
				<Button onClick={() => navigate("/recipes/new")}>
					<Plus className="w-4 h-4 mr-2" />
					Add Recipe
				</Button>
			</div>

			{/* Search and Filter */}
			<div className="flex flex-col sm:flex-row gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						placeholder="Search recipes..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
					{searchQuery && (
						<button
							onClick={() => setSearchQuery("")}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							<X className="w-4 h-4" />
						</button>
					)}
				</div>
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
				{(searchQuery || selectedTags.length > 0) && (
					<Button variant="ghost" onClick={clearFilters}>
						Clear
					</Button>
				)}
			</div>

			{/* Active filters */}
			{selectedTags.length > 0 && (
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
							className="hover:shadow-md transition-shadow cursor-pointer group"
							onClick={() => navigate(`/recipes/${recipe.id}`)}
						>
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
