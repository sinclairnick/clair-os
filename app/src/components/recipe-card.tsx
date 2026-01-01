import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Heart, Award, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LazyImage } from "@/components/ui/lazy-image";
import type { RecipeResponse } from "@/lib/api";

interface RecipeCardProps {
	recipe: RecipeResponse;
	onFavoriteToggle?: (id: string, favorite: boolean) => void;
	onClick?: (recipe: RecipeResponse) => void;
	selectionMode?: boolean;
	isSelected?: boolean;
	className?: string;
}

export function RecipeCard({
	recipe,
	onFavoriteToggle,
	onClick,
	selectionMode,
	isSelected,
	className,
}: RecipeCardProps) {
	const navigate = useNavigate();

	const handleClick = () => {
		if (onClick) {
			onClick(recipe);
		} else if (!selectionMode) {
			navigate(`/recipes/${recipe.id}`, { viewTransition: true });
		}
	};

	return (
		<Card
			className={cn(
				"hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden !pt-0",
				{
					"ring-2 ring-primary border-primary": selectionMode && isSelected
				},
				className
			)}
			onClick={handleClick}
		>
			{selectionMode && (
				<div className="absolute top-2 left-2 z-10">
					{isSelected ? (
						<CheckCircle2 className="w-6 h-6 text-primary fill-background" />
					) : (
						<div className="w-6 h-6 rounded-full border-2 border-primary/20 bg-background" />
					)}
				</div>
			)}

			<div className="relative">
				{recipe.imageUrl ? (
					<LazyImage
						src={recipe.imageUrl}
						alt={recipe.title}
						containerClassName="aspect-video w-full rounded-t-lg"
						imageClassName="group-hover:scale-105 transition-transform duration-500"
					/>
				) : (
					<div className="aspect-video w-full flex items-center justify-center bg-muted/50 rounded-t-lg">
						<Award className="w-10 h-10 text-muted-foreground/20" />
					</div>
				)}

				{recipe.isSignature && (
					<>
						<div className="absolute inset-0 z-10 pointer-events-none rounded-[inherit] overflow-hidden shadow-[inset_0_0_40px_rgba(184,134,11,0.25)]">
							{/* Subtle Golden Glow */}
							<div className="absolute inset-0 bg-gradient-to-t from-[#B38728]/10 via-transparent to-[#B38728]/5" />

							{/* Shimmer Animation Layer */}
							<div className="absolute inset-0 animate-shimmer pointer-events-none" />
						</div>

						{/* Signature Badge */}
						<div className="absolute top-3 left-3 z-20">
							<Badge className="bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#AA771C] text-amber-950 border-none shadow-[0_2px_12px_rgba(184,134,11,0.4)] px-3 py-1 gap-1.5 font-semibold text-[11px] tracking-tight transition-transform group-hover:scale-105 duration-500">
								<Award className="w-3.5 h-3.5 fill-amber-950/20" />
								Signature
							</Badge>
						</div>
					</>
				)}

				{onFavoriteToggle && (
					<Button
						size="icon"
						variant="ghost"
						className={cn(
							"absolute top-3 right-3 z-20 h-9 w-9 rounded-full bg-background/90 backdrop-blur-md shadow-sm transition-all duration-300 hover:scale-110 active:scale-95",
							recipe.favorite ? "opacity-100" : "opacity-40 group-hover:opacity-100"
						)}
						onClick={(e) => {
							e.stopPropagation();
							onFavoriteToggle(recipe.id, !recipe.favorite);
						}}
					>
						<Heart
							className={cn(
								"w-5 h-5 transition-all duration-300",
								recipe.favorite ? "fill-red-500 text-red-500 animate-in zoom-in-50" : "text-muted-foreground"
							)}
						/>
					</Button>
				)}
			</div>

			<CardHeader className="pb-2">
				<CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">{recipe.title}</CardTitle>
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
								className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-secondary text-secondary-foreground"
							>
								{tag}
							</span>
						))}
						{(recipe.tags as string[]).length > 3 && (
							<span className="text-[10px] text-muted-foreground">
								+{(recipe.tags as string[]).length - 3}
							</span>
						)}
					</div>
				)}
			</CardContent>
		</Card >
	);
}
