import { useFormContext, Controller, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface IngredientRowProps {
	index: number;
	onRemove: (index: number) => void;
	ingredientIdToFocus: string | null;
	onFocusHandled: () => void;
}

export function IngredientRow({ index, onRemove, ingredientIdToFocus, onFocusHandled }: IngredientRowProps) {
	const { control } = useFormContext();
	const ingredient = useWatch({
		control,
		name: `ingredients.${index}`,
	});

	if (!ingredient) return null;

	return (
		<div className="flex items-center gap-1.5 md:gap-2 p-1.5 md:p-1 rounded-md">
			<Controller
				name={`ingredients.${index}.quantity`}
				control={control}
				render={({ field }) => (
					<Input
						{...field}
						placeholder="Qty"
						ref={(e) => {
							field.ref(e);
							if (e && ingredientIdToFocus && ingredient.id === ingredientIdToFocus) {
								e.focus();
								onFocusHandled();
							}
						}}
						className="w-14 md:w-16"
					/>
				)}
			/>
			<Controller
				name={`ingredients.${index}.unit`}
				control={control}
				render={({ field }) => (
					<Input
						{...field}
						placeholder="Unit"
						list="unit-suggestions"
						className="w-16 md:w-20"
					/>
				)}
			/>
			<Controller
				name={`ingredients.${index}.name`}
				control={control}
				render={({ field }) => (
					<Input
						{...field}
						placeholder="Ingredient name"
						className="flex-1 min-w-0"
					/>
				)}
			/>
			<Button
				type="button"
				size="icon"
				variant="ghost"
				className="shrink-0"
				onClick={() => onRemove(index)}
			>
				<X className="w-4 h-4 md:w-3 md:h-3 text-muted-foreground" />
			</Button>
		</div>
	);
}
