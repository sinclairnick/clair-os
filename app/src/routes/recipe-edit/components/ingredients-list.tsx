import { useFormContext, useWatch } from "react-hook-form";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FolderPlus } from "lucide-react";
import { IngredientGroupSection } from "./ingredient-group-section";
import { IngredientRow } from "./ingredient-row";

interface IngredientsListProps {
	groupFields: any[];
	ingredientFields: any[];
	ingredientIdToFocus: string | null;
	setIngredientIdToFocus: (id: string | null) => void;
	handleAddIngredient: (groupId?: string | null) => void;
	handleAddGroup: () => void;
	handleRemoveGroup: (index: number) => void;
	toggleGroupExpanded: (index: number) => void;
	removeIngredient: (index: number) => void;
}

export function IngredientsList({
	groupFields,
	ingredientFields,
	ingredientIdToFocus,
	setIngredientIdToFocus,
	handleAddIngredient,
	handleAddGroup,
	handleRemoveGroup,
	toggleGroupExpanded,
	removeIngredient,
}: IngredientsListProps) {
	const { control } = useFormContext();
	const ingredients = useWatch({ control, name: "ingredients" }) || [];

	return (
		<>
			<CardHeader className="pb-3">
				<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
					<CardTitle>Ingredients</CardTitle>
					<div className="grid grid-cols-2 md:flex gap-2">
						<Button type="button" size="sm" variant="outline" onClick={handleAddGroup} className="justify-center">
							<FolderPlus className="w-4 h-4 md:mr-1" />
							<span className="hidden md:inline">Add Section</span>
							<span className="md:hidden">Section</span>
						</Button>
						<Button type="button" size="sm" variant="secondary" onClick={() => handleAddIngredient()} className="justify-center">
							<Plus className="w-4 h-4 md:mr-1" />
							Add
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Ingredient Groups */}
				{groupFields.map((field: any, groupIndex: number) => {
					return (
						<IngredientGroupSection
							key={field.id}
							groupIndex={groupIndex}
							ingredientFields={ingredientFields}
							handleAddIngredient={handleAddIngredient}
							handleRemoveGroup={handleRemoveGroup}
							toggleGroupExpanded={toggleGroupExpanded}
							ingredientIdToFocus={ingredientIdToFocus}
							onFocusHandled={() => setIngredientIdToFocus(null)}
							removeIngredient={removeIngredient}
						/>
					);
				})}

				{/* Ungrouped Ingredients */}
				{(() => {
					const ungroupedIngredients = ingredientFields
						.map((field: any, index: number) => ({ field, index }))
						.filter(({ index }: any) => !ingredients[index]?.groupId);

					if (ungroupedIngredients.length === 0 && groupFields.length > 0) return null;

					return (
						<div className="space-y-2">
							{groupFields.length > 0 && (
								<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ungrouped</p>
							)}
							{ingredientFields.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-4">
									No ingredients added yet. Click "Add" or use @mentions in instructions.
								</p>
							) : (
								ungroupedIngredients.map(({ field, index }: any) => (
									<IngredientRow
										key={field.id}
										index={index}
										onRemove={removeIngredient}
										ingredientIdToFocus={ingredientIdToFocus}
										onFocusHandled={() => setIngredientIdToFocus(null)}
									/>
								))
							)}
						</div>
					);
				})()}
			</CardContent>
		</>
	);
}
