import { useMemo } from "react";
import { useFormContext, useWatch, Controller } from "react-hook-form";
import { CardContent } from "@/components/ui/card";
import { RecipeEditor } from "@/components/editor";

interface InstructionsSectionProps {
	editorKey: number;
	editorRef: any;
	handleIngredientsChange: (ingredients: any[]) => void;
}

export function InstructionsSection({ editorKey, editorRef, handleIngredientsChange }: InstructionsSectionProps) {
	const { control } = useFormContext();
	const ingredients = useWatch({ control, name: "ingredients" }) || [];

	// Memoize existing ingredients for the editor to prevent unnecessary re-renders of the editor itself
	const existingIngredients = useMemo(() => {
		const uniqueIngredients = (ingredients as any[]).reduce((acc: any[], current: any) => {
			const normalizedName = current.name.trim().toLowerCase();
			if (normalizedName && !acc.find(item => item.name.trim().toLowerCase() === normalizedName)) {
				acc.push({
					id: current.id,
					name: current.name,
					quantity: current.quantity ? parseFloat(current.quantity) : undefined,
					unit: current.unit,
				});
			}
			return acc;
		}, []);
		return uniqueIngredients;
	}, [ingredients]);

	return (
		<CardContent>
			<div className="border border-border rounded-lg overflow-hidden">
				<Controller
					name="instructions"
					control={control}
					render={({ field }) => (
						<RecipeEditor
							{...field}
							key={editorKey}
							ref={editorRef}
							content={field.value}
							onChange={field.onChange}
							onIngredientsChange={handleIngredientsChange}
							existingIngredients={existingIngredients}
						/>
					)}
				/>
			</div>
		</CardContent>
	);
}
