import { useFormContext, Controller } from "react-hook-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Clock, Users, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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

				<div className="flex items-center justify-between pt-2 border-t">
					<div className="space-y-0.5">
						<Label className="text-sm font-medium flex items-center gap-2">
							<Star className="w-4 h-4 text-primary fill-primary" />
							Signature Dish
						</Label>
						<p className="text-[10px] text-muted-foreground"> Highlight as a family favorite</p>
					</div>
					<Controller
						control={control}
						name="isSignature"
						render={({ field }) => (
							<Checkbox
								checked={field.value}
								onCheckedChange={field.onChange}
							/>
						)}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
