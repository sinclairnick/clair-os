import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { buttonVariants } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
import { Loader2, Utensils, Users, Clock } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

interface RecipeHoverPreviewProps {
	recipeId: string;
}

export function RecipeHoverPreview({ recipeId }: RecipeHoverPreviewProps) {
	const { data: recipe, isLoading } = useQuery({
		queryKey: queryKeys.recipes.detail(recipeId || ""),
		queryFn: () => api.recipes.get(recipeId!),
		enabled: !!recipeId,
	});

	if (!recipeId) return null;

	return (
		<HoverCard>
			<HoverCardTrigger
				className={cn(
					buttonVariants({ variant: "ghost", size: "icon" }),
					"h-6 w-6 p-0 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
				)}
			>
				<Utensils className="h-4 w-4" />
				<span className="sr-only">View recipe</span>
			</HoverCardTrigger>
			<HoverCardContent className="w-80 p-0 overflow-hidden" align="start">
				<div className="flex flex-col gap-2">
					{isLoading ? (
						<div className="flex items-center justify-center h-32">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : recipe ? (
						<>
							{recipe.imageUrl && (
								<div className="h-32 w-full overflow-hidden bg-muted">
									<img
										src={recipe.imageUrl}
										alt={recipe.title}
										loading="lazy"
										className="h-full w-full object-cover"
									/>
								</div>
							)}
							<div className="p-4 space-y-3">
								<div className="space-y-1">
									<h4 className="text-sm font-semibold leading-none">{recipe.title}</h4>
									{recipe.description && (
										<p className="text-xs text-muted-foreground line-clamp-2">
											{recipe.description}
										</p>
									)}
								</div>

								<div className="flex items-center gap-4 text-xs text-muted-foreground">
									{(recipe.prepTimeMinutes || recipe.cookTimeMinutes) && (
										<div className="flex items-center gap-1">
											<Clock className="w-3 h-3" />
											<span>
												{((recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0))}m
											</span>
										</div>
									)}
									<div className="flex items-center gap-1">
										<Users className="w-3 h-3" />
										<span>{recipe.servings} ppl</span>
									</div>
									<div className="flex items-center gap-1">
										<Utensils className="w-3 h-3" />
										<span>{recipe.ingredients.length} ingr.</span>
									</div>
								</div>

								<div className="pt-2">
									<Link
										to={`/recipes/${recipe.id}`}
										className={cn(buttonVariants({ size: "sm" }), "w-full")}
									>
										View Full Recipe
									</Link>
								</div>
							</div>
						</>
					) : (
						<div className="p-4 text-center text-sm text-muted-foreground">
							Recipe not found
						</div>
					)}
				</div>
			</HoverCardContent>
		</HoverCard>
	);
}
