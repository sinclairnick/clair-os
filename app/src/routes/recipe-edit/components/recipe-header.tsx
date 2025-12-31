import { useNavigate } from "react-router";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecipeHeaderProps {
	isNew: boolean;
	isSaving: boolean;
	isDeleting: boolean;
	onDelete: () => void;
}

export function RecipeHeader({ isNew, isSaving, isDeleting, onDelete }: RecipeHeaderProps) {
	const navigate = useNavigate();
	const { watch } = useFormContext();
	const title = watch("title");

	return (
		<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
			<div className="flex items-center gap-3 md:gap-4">
				<Button type="button" variant="ghost" size="icon" onClick={() => navigate("/recipes")}>
					<ArrowLeft className="w-5 h-5" />
				</Button>
				<h1 className="text-xl md:text-2xl font-bold">
					{isNew ? "New Recipe" : "Edit Recipe"}
				</h1>
			</div>
			<div className="grid grid-cols-2 md:flex gap-2 w-full md:w-auto">
				{!isNew && (
					<Button
						type="button"
						variant="outline"
						onClick={onDelete}
						disabled={isDeleting}
						className="justify-center"
					>
						{isDeleting ? (
							<Loader2 className="w-4 h-4 md:mr-2 animate-spin" />
						) : (
							<Trash2 className="w-4 h-4 md:mr-2" />
						)}
						Delete
					</Button>
				)}
				<Button
					type="submit"
					disabled={isSaving || !title?.trim()}
					className={cn("justify-center", isNew && "col-span-2")}
				>
					{isSaving ? (
						<Loader2 className="w-4 h-4 md:mr-2 animate-spin" />
					) : (
						<Save className="w-4 h-4 md:mr-2" />
					)}
					<span className="md:hidden">{isNew ? "Create" : "Save"}</span>
					<span className="hidden md:inline">{isNew ? "Create Recipe" : "Save Recipe"}</span>
				</Button>
			</div>
		</div>
	);
}
