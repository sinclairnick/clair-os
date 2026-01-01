import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { RecipeHoverPreview } from "@/components/recipe-hover-preview";
import { Badge } from "@/components/ui/badge";

interface ItemRowProps {
	item: any;
	category?: string;
	isPending: boolean;
	onToggle: () => void;
	onEdit: () => void;
	onDelete: () => void;
	isEditing: boolean;
	editingName: string;
	setEditingName: (name: string) => void;
	onSave: () => void;
	onCancel: () => void;
}

export function ItemRow({
	item,
	category,
	isPending,
	onToggle,
	onEdit,
	onDelete,
	isEditing,
	editingName,
	setEditingName,
	onSave,
	onCancel,
}: ItemRowProps) {
	return (
		<div className="flex items-center gap-3 py-1.5 group">
			<Checkbox
				checked={item.checked}
				disabled={isPending}
				onCheckedChange={onToggle}
			/>

			{isEditing ? (
				<div className="flex items-center gap-1 flex-1">
					<Input
						value={editingName}
						onChange={(e) => setEditingName(e.target.value)}
						onBlur={onSave}
						onKeyDown={(e) => {
							if (e.key === "Enter") onSave();
							if (e.key === "Escape") onCancel();
						}}
						autoFocus
						className="h-7 text-sm"
					/>
				</div>
			) : (
				<div className="flex-1 flex items-center gap-2 min-w-0">
					<span
						className={`flex-1 cursor-pointer hover:bg-muted/50 rounded px-1 -ml-1 py-0.5 ${item.checked ? "line-through text-muted-foreground" : ""
							}`}
						onClick={onEdit}
					>
						{item.quantity > 1 && `${item.quantity}x `}
						{item.name}
						{item.unit && ` (${item.unit})`}
					</span>
					{category && category !== 'Other' && (
						<Badge variant="secondary" className="shrink-0 px-1.5 py-0 h-4 text-[9px] font-semibold uppercase tracking-wider bg-muted/50 text-muted-foreground/70 border-none">
							{category}
						</Badge>
					)}
				</div>
			)}

			{item.sourceRecipeId && (
				<div className="mx-1">
					<RecipeHoverPreview recipeId={item.sourceRecipeId} />
				</div>
			)
			}

			<Button
				size="icon"
				variant="ghost"
				className="opacity-0 group-hover:opacity-100 h-6 w-6"
				onClick={onDelete}
			>
				<Trash2 className="w-3 h-3 text-muted-foreground" />
			</Button>
		</div>
	);
}
