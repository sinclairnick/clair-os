import { useFormContext } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function RecipeBasicInfo() {
	const { register, formState: { errors } } = useFormContext();

	return (
		<Card>
			<CardContent className="pt-6 space-y-4">
				<div>
					<label className="text-sm font-medium">Title *</label>
					<Input
						placeholder="Recipe title"
						{...register("title")}
						className={cn(
							"!text-lg font-semibold leading-[2rem]",
							errors.title && "border-destructive"
						)}
					/>
					{errors.title && (
						<p className="text-sm text-destructive mt-1">{errors.title.message as string}</p>
					)}
				</div>
				<div>
					<label className="text-sm font-medium">Description</label>
					<Textarea
						placeholder="Brief description of the recipe"
						{...register("description")}
						rows={2}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
