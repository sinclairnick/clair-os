import { useState, useRef, useCallback } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	FileText,
	Link,
	Camera,
	Loader2,
	Upload,
	Sparkles,
	ArrowRight,
	Check,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentFamilyId } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
import { cn } from "@/lib/utils";

interface ParsedRecipe {
	title: string;
	description?: string;
	servings: number;
	yield?: string;
	prepTimeMinutes?: number;
	cookTimeMinutes?: number;
	instructions: string;
	tags: string[];
	ingredients: {
		name: string;
		quantity: number;
		unit: string;
	}[];
}


/**
 * Clean up strings from legacy exports, handling common Unicode issues
 */
function cleanString(str: string): string {
	if (!str) return "";
	return str
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, " ")
		.trim();
}

// Parse recipe text into structured format using AI-like heuristics
function parseRecipeText(text: string): ParsedRecipe {
	const lines = text.split("\n").map((l) => l.trim()).filter((l) => l);

	// Default values
	const recipe: ParsedRecipe = {
		title: "",
		description: "",
		servings: 4,
		instructions: "",
		tags: [],
		ingredients: [],
	};

	// Try to extract title (first non-empty line)
	if (lines.length > 0) {
		recipe.title = cleanString(lines[0]);
	}

	// Try to detect sections
	let currentSection = "header";
	const instructionLines: string[] = [];
	const ingredientLines: string[] = [];

	for (let i = 1; i < lines.length; i++) {
		const line = cleanString(lines[i]);
		const lowerLine = line.toLowerCase();

		// Detect section headers
		if (lowerLine.includes("ingredient") || lowerLine === "ingredients:" || lowerLine === "ingredients") {
			currentSection = "ingredients";
			continue;
		}
		if (lowerLine.includes("instruction") || lowerLine.includes("method") || lowerLine.includes("direction") || lowerLine.includes("step")) {
			currentSection = "instructions";
			continue;
		}

		// Parse based on current section
		if (currentSection === "header") {
			// Check for metadata
			if (lowerLine.includes("serving") || lowerLine.includes("yield")) {
				const match = line.match(/(\d+)/);
				if (match) recipe.servings = parseInt(match[1], 10);

				// Only set yield if it's not just describing servings
				if (lowerLine.includes("yield") && !lowerLine.includes("serving")) {
					recipe.yield = line.replace(/yield:?/i, "").trim();
				}
			} else if (lowerLine.includes("prep")) {
				const match = line.match(/(\d+)/);
				if (match) recipe.prepTimeMinutes = parseInt(match[1], 10);
			} else if (lowerLine.includes("cook")) {
				const match = line.match(/(\d+)/);
				if (match) recipe.cookTimeMinutes = parseInt(match[1], 10);
			} else if (!recipe.description && line.length > 10) {
				recipe.description = line;
			}
		} else if (currentSection === "ingredients") {
			if (line.length > 0) {
				ingredientLines.push(line);
			}
		} else if (currentSection === "instructions") {
			if (line.length > 0) {
				// Detect numbered steps
				const stepMatch = line.match(/^(\d+)\.?\s*(.*)$/);
				if (stepMatch) {
					const num = stepMatch[1];
					const title = stepMatch[2].trim();
					if (title) {
						instructionLines.push(`STEP_HEADER:${num}:${title}`);
					} else {
						instructionLines.push(`STEP_HEADER:${num}`);
					}
				} else {
					instructionLines.push(line);
				}
			}
		}
	}

	// Parse ingredients
	recipe.ingredients = ingredientLines.map((line) => {
		// Try to parse quantity, unit, and name
		const match = line.match(/^([\d./]+)?\s*([a-zA-Z]+)?\s*[-–]?\s*(.+)$/);
		if (match) {
			const [, qty, unit, name] = match;
			let quantity = 1;
			try {
				if (qty) {
					if (qty.includes("/")) {
						const [num, den] = qty.split("/").map(Number);
						quantity = num / den;
					} else {
						quantity = parseFloat(qty);
					}
				}
			} catch (e) {
				quantity = 1;
			}
			return {
				quantity: isNaN(quantity) ? 1 : quantity,
				unit: unit || "",
				name: name || line,
			};
		}
		return { quantity: 1, unit: "", name: line };
	});

	// Format instructions as JSON for the BlockNote editor (array of blocks)
	const instructionBlocks = instructionLines.map((line) => {
		if (line.startsWith("STEP_HEADER:")) {
			const parts = line.split(":");
			const stepNum = parts[1];
			const title = parts.slice(2).join(":");
			const text = title ? `Step ${stepNum}: ${title}` : `Step ${stepNum}`;
			return {
				type: "heading",
				props: { level: 3 },
				content: [{ type: "text", text, styles: {} }],
			};
		}
		return {
			type: "paragraph",
			content: [{ type: "text", text: line, styles: {} }],
		};
	});
	recipe.instructions = JSON.stringify(instructionBlocks);

	return recipe;
}

interface RecipeImportDialogProps {
	trigger?: React.ReactNode;
}

export function RecipeImportDialog({ trigger }: RecipeImportDialogProps) {
	const navigate = useNavigate();
	const familyId = useCurrentFamilyId();
	const queryClient = useQueryClient();

	const [open, setOpen] = useState(false);
	const [tab, setTab] = useState<"text" | "url" | "photo">("text");
	const [textInput, setTextInput] = useState("");
	const [urlInput, setUrlInput] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [parsedRecipe, setParsedRecipe] = useState<ParsedRecipe | null>(null);
	const [previewMode, setPreviewMode] = useState(false);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const cameraInputRef = useRef<HTMLInputElement>(null);

	const createMutation = useMutation({
		mutationFn: async (recipe: ParsedRecipe) => {
			if (!familyId) throw new Error("No family selected");
			return api.recipes.create({
				familyId,
				title: recipe.title,
				description: recipe.description,
				servings: recipe.servings,
				yield: recipe.yield,
				prepTimeMinutes: recipe.prepTimeMinutes,
				cookTimeMinutes: recipe.cookTimeMinutes,
				instructions: recipe.instructions,
				tags: recipe.tags,
				ingredients: recipe.ingredients.map((ing) => ({
					name: ing.name,
					quantity: ing.quantity,
					unit: ing.unit,
				})),
			});
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all(familyId || "") });
			toast.success("Recipe imported successfully!");
			setOpen(false);
			navigate(`/recipes/${data.id}`);
		},
		onError: (error: Error) => {
			toast.error(`Failed to import recipe: ${error.message}`);
		},
	});

	const handleTextParse = useCallback(() => {
		if (!textInput.trim()) {
			toast.error("Please paste some recipe text first");
			return;
		}
		setIsProcessing(true);
		try {
			const parsed = parseRecipeText(textInput);
			setParsedRecipe(parsed);
			setPreviewMode(true);
		} catch (error) {
			toast.error("Failed to parse recipe text");
		} finally {
			setIsProcessing(false);
		}
	}, [textInput]);

	const handleUrlFetch = useCallback(async () => {
		if (!urlInput.trim()) {
			toast.error("Please enter a URL first");
			return;
		}
		setIsProcessing(true);
		try {
			// In a real implementation, this would call an API endpoint to fetch and parse the URL
			// For now, show a placeholder message
			toast.info("URL import coming soon! For now, copy the recipe text and use the Text tab.");
		} catch (error) {
			toast.error("Failed to fetch recipe from URL");
		} finally {
			setIsProcessing(false);
		}
	}, [urlInput]);

	const handlePhotoCapture = useCallback(async (_file: File) => {
		setIsProcessing(true);
		try {
			// In a real implementation, this would use OCR (like Google Cloud Vision or Tesseract)
			// For now, show a placeholder message
			toast.info("Photo import coming soon! For now, copy the recipe text and use the Text tab.");
		} catch (error) {
			toast.error("Failed to process image");
		} finally {
			setIsProcessing(false);
		}
	}, []);

	const handleImport = useCallback(() => {
		if (!parsedRecipe) return;
		createMutation.mutate(parsedRecipe);
	}, [parsedRecipe, createMutation]);

	const resetState = useCallback(() => {
		setTextInput("");
		setUrlInput("");
		setParsedRecipe(null);
		setPreviewMode(false);
		setIsProcessing(false);
	}, []);

	if (!familyId) return null;

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				setOpen(isOpen);
				if (!isOpen) resetState();
			}}
		>
			<DialogTrigger>
				{trigger || (
					<Button variant="outline">
						<Upload className="w-4 h-4 mr-2" />
						Import Recipe
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Sparkles className="w-5 h-5 text-primary" />
						Import Recipe
					</DialogTitle>
					<DialogDescription>
						Paste recipe text, enter a URL, or take a photo of a recipe to import it.
					</DialogDescription>
				</DialogHeader>

				{previewMode && parsedRecipe ? (
					<div className="space-y-4">
						{/* Preview Header */}
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-semibold">Preview</h3>
							<Button variant="ghost" size="sm" onClick={() => setPreviewMode(false)}>
								<ArrowRight className="w-4 h-4 mr-1 rotate-180" />
								Back
							</Button>
						</div>

						{/* Recipe Preview Card */}
						<Card>
							<CardContent className="pt-4 space-y-4">
								<div>
									<label className="text-xs uppercase text-muted-foreground">Title</label>
									<p className="text-lg font-semibold">{parsedRecipe.title || "Untitled Recipe"}</p>
								</div>

								{parsedRecipe.description && (
									<div>
										<label className="text-xs uppercase text-muted-foreground">Description</label>
										<p className="text-sm text-muted-foreground">{parsedRecipe.description}</p>
									</div>
								)}

								<div className="flex gap-4 text-sm">
									<div>
										<label className="text-xs uppercase text-muted-foreground">Servings</label>
										<p>{parsedRecipe.servings}</p>
									</div>
									{parsedRecipe.prepTimeMinutes && (
										<div>
											<label className="text-xs uppercase text-muted-foreground">Prep Time</label>
											<p>{parsedRecipe.prepTimeMinutes} min</p>
										</div>
									)}
									{parsedRecipe.cookTimeMinutes && (
										<div>
											<label className="text-xs uppercase text-muted-foreground">Cook Time</label>
											<p>{parsedRecipe.cookTimeMinutes} min</p>
										</div>
									)}
								</div>

								{parsedRecipe.tags.length > 0 && (
									<div>
										<label className="text-xs uppercase text-muted-foreground">Tags</label>
										<div className="flex flex-wrap gap-1 mt-1">
											{parsedRecipe.tags.map((tag) => (
												<Badge key={tag} variant="secondary" className="text-xs">
													{tag}
												</Badge>
											))}
										</div>
									</div>
								)}

								<div>
									<label className="text-xs uppercase text-muted-foreground">
										Ingredients ({parsedRecipe.ingredients.length})
									</label>
									<ul className="mt-1 text-sm space-y-0.5 max-h-32 overflow-y-auto">
										{parsedRecipe.ingredients.map((ing, i) => (
											<li key={i} className="flex items-center gap-1">
												<Check className="w-3 h-3 text-green-500 shrink-0" />
												<span className="text-muted-foreground">
													{ing.quantity} {ing.unit}
												</span>
												{ing.name}
											</li>
										))}
									</ul>
								</div>
							</CardContent>
						</Card>

						{/* Import Button */}
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setPreviewMode(false)}>
								Cancel
							</Button>
							<Button onClick={handleImport} disabled={createMutation.isPending}>
								{createMutation.isPending ? (
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								) : (
									<Check className="w-4 h-4 mr-2" />
								)}
								Import Recipe
							</Button>
						</div>
					</div>
				) : (
					<Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="text" className="gap-2">
								<FileText className="w-4 h-4" />
								<span className="hidden sm:inline">Text</span>
							</TabsTrigger>
							<TabsTrigger value="url" className="gap-2">
								<Link className="w-4 h-4" />
								<span className="hidden sm:inline">URL</span>
							</TabsTrigger>
							<TabsTrigger value="photo" className="gap-2">
								<Camera className="w-4 h-4" />
								<span className="hidden sm:inline">Photo</span>
							</TabsTrigger>
						</TabsList>

						<TabsContent value="text" className="space-y-4 mt-4">
							<div className="space-y-2">
								<label className="text-sm font-medium">Paste Recipe Text</label>
								<Textarea
									placeholder="Paste your recipe text here...

Example format:
Chocolate Chip Cookies

A delicious classic cookie recipe.

Ingredients:
2 cups flour
1 cup butter
1 cup sugar

Instructions:
1. Preheat oven to 350°F
2. Mix ingredients..."
									value={textInput}
									onChange={(e) => setTextInput(e.target.value)}
									className="min-h-[250px] font-mono text-sm"
								/>
							</div>
							<Button
								onClick={handleTextParse}
								disabled={isProcessing || !textInput.trim()}
								className="w-full"
							>
								{isProcessing ? (
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								) : (
									<Sparkles className="w-4 h-4 mr-2" />
								)}
								Parse Recipe
							</Button>
						</TabsContent>

						<TabsContent value="url" className="space-y-4 mt-4">
							<div className="space-y-2">
								<label className="text-sm font-medium">Recipe URL</label>
								<Input
									type="url"
									placeholder="https://example.com/recipe/..."
									value={urlInput}
									onChange={(e) => setUrlInput(e.target.value)}
								/>
								<p className="text-xs text-muted-foreground">
									Paste a link to a recipe page and we'll try to extract the recipe details.
								</p>
							</div>
							<Button
								onClick={handleUrlFetch}
								disabled={isProcessing || !urlInput.trim()}
								className="w-full"
							>
								{isProcessing ? (
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								) : (
									<Link className="w-4 h-4 mr-2" />
								)}
								Fetch Recipe
							</Button>
						</TabsContent>

						<TabsContent value="photo" className="space-y-4 mt-4">
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									{/* Camera capture */}
									<Card
										className={cn(
											"cursor-pointer hover:border-primary transition-colors",
											"flex flex-col items-center justify-center py-8"
										)}
										onClick={() => cameraInputRef.current?.click()}
									>
										<Camera className="w-10 h-10 mb-2 text-muted-foreground" />
										<p className="text-sm font-medium">Take Photo</p>
										<p className="text-xs text-muted-foreground">Use your camera</p>
									</Card>
									<input
										ref={cameraInputRef}
										type="file"
										accept="image/*"
										capture="environment"
										className="hidden"
										onChange={(e) => {
											const file = e.target.files?.[0];
											if (file) handlePhotoCapture(file);
										}}
									/>

									{/* File upload */}
									<Card
										className={cn(
											"cursor-pointer hover:border-primary transition-colors",
											"flex flex-col items-center justify-center py-8"
										)}
										onClick={() => fileInputRef.current?.click()}
									>
										<Upload className="w-10 h-10 mb-2 text-muted-foreground" />
										<p className="text-sm font-medium">Upload Image</p>
										<p className="text-xs text-muted-foreground">From your device</p>
									</Card>
									<input
										ref={fileInputRef}
										type="file"
										accept="image/*"
										className="hidden"
										onChange={(e) => {
											const file = e.target.files?.[0];
											if (file) handlePhotoCapture(file);
										}}
									/>
								</div>
								<p className="text-xs text-muted-foreground text-center">
									Take a photo of a recipe or upload an image to extract the recipe text automatically.
								</p>
							</div>
						</TabsContent>
					</Tabs>
				)}
			</DialogContent>
		</Dialog>
	);
}
