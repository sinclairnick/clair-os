import { useNavigate } from "react-router";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Save, Loader2 } from "lucide-react";
import { PageHeader, PageHeaderHeading, PageHeaderActions } from "@/components/page-header";

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
		<PageHeader>
			<div className="flex items-center gap-3 md:gap-4">
				<Button type="button" variant="ghost" size="icon" onClick={() => navigate("/recipes")}>
					<ArrowLeft className="w-5 h-5" />
				</Button>
				<PageHeaderHeading title={isNew ? "New Recipe" : "Edit Recipe"} />
			</div>
			<PageHeaderActions>
				{!isNew && (
					<Button
						type="button"
						variant="outline"
						onClick={onDelete}
						disabled={isDeleting}
					>
						{isDeleting ? (
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
						) : (
							<Trash2 className="w-4 h-4 mr-2" />
						)}
						Delete
					</Button>
				)}
				<Button
					type="submit"
					disabled={isSaving || !title?.trim()}
				>
					{isSaving ? (
						<Loader2 className="w-4 h-4 mr-2 animate-spin" />
					) : (
						<Save className="w-4 h-4 mr-2" />
					)}
					<span>{isNew ? "Create Recipe" : "Save Recipe"}</span>
				</Button>
			</PageHeaderActions>
		</PageHeader>
	);
}
