import { useFormContext } from "react-hook-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function RecipeImage() {
	const { watch, setValue, register } = useFormContext();
	const imageUrl = watch("imageUrl");

	return (
		<Card className="overflow-hidden">
			{imageUrl && (
				<div className="aspect-video w-full overflow-hidden border-b">
					<img
						src={imageUrl}
						alt="Recipe preview"
						loading="lazy"
						className="w-full h-full object-cover"
						onError={(e) => {
							(e.target as HTMLImageElement).style.display = 'none';
						}}
					/>
				</div>
			)}
			<CardHeader className="pb-3 px-4">
				<div className="flex items-center justify-between gap-2">
					<CardTitle>Image</CardTitle>
					{imageUrl && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 px-2 text-muted-foreground hover:text-destructive"
							onClick={() => {
								setValue("imageUrl", "");
								// Also clear file input if possible
								const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
								if (fileInput) fileInput.value = '';
							}}
						>
							<X className="w-3.5 h-3.5 mr-1" />
							Clear
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<label className="text-sm font-medium">Upload Image</label>
					<div className="flex gap-2">
						<Input
							type="file"
							accept="image/*"
							onChange={async (e) => {
								const file = e.target.files?.[0];
								if (file) {
									try {
										const { url } = await api.storage.upload(file);
										setValue("imageUrl", url);
										toast.success("Image uploaded");
									} catch (error) {
										toast.error("Failed to upload image");
									}
								}
							}}
						/>
					</div>
				</div>

				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t" />
					</div>
					<div className="relative flex justify-center text-xs uppercase">
						<span className="bg-background px-2 text-muted-foreground">Or Use URL</span>
					</div>
				</div>

				<Input
					placeholder="Image URL"
					{...register("imageUrl")}
				/>
			</CardContent>
		</Card>
	);
}
