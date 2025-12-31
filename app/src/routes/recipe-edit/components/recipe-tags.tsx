import { useFormContext, Controller } from "react-hook-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";

interface RecipeTagsProps {
	handleAddTag: (tag: string) => void;
	handleRemoveTag: (tag: string) => void;
}

export function RecipeTags({ handleAddTag, handleRemoveTag }: RecipeTagsProps) {
	const { control } = useFormContext();

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle>Tags</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex gap-2">
					<Input
						placeholder="Add tag..."
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								handleAddTag((e.target as HTMLInputElement).value);
								(e.target as HTMLInputElement).value = "";
							}
						}}
					/>
					<Button
						type="button"
						size="icon"
						variant="secondary"
						onClick={(e) => {
							const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
							handleAddTag(input.value);
							input.value = "";
						}}
					>
						<Plus className="w-4 h-4" />
					</Button>
				</div>
				<div className="flex flex-wrap gap-2">
					<Controller
						name="tags"
						control={control}
						render={({ field }) => {
							const tags = (field.value as string[]) || [];
							if (tags.length === 0) {
								return <p className="text-sm text-muted-foreground">No tags</p>;
							}
							return (
								<>
									{tags.map((tag) => (
										<Badge key={tag} variant="secondary" className="gap-1 pr-1">
											{tag}
											<button
												type="button"
												onClick={() => handleRemoveTag(tag)}
												className="ml-1 hover:text-destructive rounded-full"
											>
												<X className="w-3 h-3" />
											</button>
										</Badge>
									))}
								</>
							);
						}}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
