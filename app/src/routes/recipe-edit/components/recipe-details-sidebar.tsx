import { useFormContext, Controller } from "react-hook-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Clock, Users } from "lucide-react";

export function RecipeDetailsSidebar() {
	const { control, register } = useFormContext();

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle>Details</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div>
					<label className="text-sm font-medium flex items-center gap-1 mb-1">
						<Users className="w-4 h-4" />
						Servings
					</label>
					<Controller
						control={control}
						name="servings"
						render={({ field }) => (
							<Input
								type="number"
								min={1}
								{...field}
								onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
							/>
						)}
					/>
				</div>
				<div>
					<label className="text-sm font-medium flex items-center gap-1 mb-1">
						Yield
					</label>
					<Input
						placeholder="e.g. 12 cookies"
						{...register("yield")}
					/>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div>
						<label className="text-sm font-medium flex items-center gap-1 mb-1">
							<Clock className="w-4 h-4" />
							Prep (min)
						</label>
						<Controller
							control={control}
							name="prepTimeMinutes"
							defaultValue={0}
							render={({ field }) => (
								<Input
									type="number"
									min={0}
									placeholder="0"
									value={field.value}
									onChange={(e) => field.onChange(parseInt(e.target.value))}
								/>
							)}
						/>
					</div>
					<div>
						<label className="text-sm font-medium flex items-center gap-1 mb-1">
							<Clock className="w-4 h-4" />
							Cook (min)
						</label>
						<Controller
							control={control}
							name="cookTimeMinutes"
							defaultValue={0}
							render={({ field }) => (
								<Input
									type="number"
									min={0}
									placeholder="0"
									value={field.value}
									onChange={(e) => field.onChange(parseInt(e.target.value))}
								/>
							)}
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
