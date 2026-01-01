import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tabs,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, CheckCircle, Trash2, MoreVertical, Pencil, FileText, LayoutGrid, List as ListIcon, Pin, PinOff } from "lucide-react";
import {
	queryKeys,
	toggleShoppingItemMutation,
	deleteShoppingListMutation,
	updateShoppingListMutation,
	updateShoppingItemNameMutation,
} from "@/lib/queries";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { inferCategory, GROCERY_CATEGORIES } from "@clairos/shared";
import { cn } from "@/lib/utils";
import { ItemRow } from "@/routes/shopping-item-row";
import type { ShoppingListResponse } from "@/lib/api";
import { useCurrentFamilyId } from "@/components/auth-provider";

interface ShoppingListCardProps {
	list: ShoppingListResponse;
	defaultViewMode?: "inline" | "sectioned";
}

export function ShoppingListCard({ list, defaultViewMode = "inline" }: ShoppingListCardProps) {
	const familyId = useCurrentFamilyId();
	const queryClient = useQueryClient();

	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [editingListName, setEditingListName] = useState(list.name);

	const [editingItemId, setEditingItemId] = useState<string | null>(null);
	const [editingItemName, setEditingItemName] = useState("");

	const [isEditingNotes, setIsEditingNotes] = useState(false);
	const [editingNotesValue, setEditingNotesValue] = useState(list.notes || "");

	const [viewMode, setViewMode] = useState<"inline" | "sectioned">(defaultViewMode);
	const [newItemInput, setNewItemInput] = useState("");

	const invalidateLists = () => {
		if (familyId) {
			queryClient.invalidateQueries({
				queryKey: queryKeys.shopping.lists(familyId),
			});
			// Also invalidate dashboard summary if needed, as it shows lists
			queryClient.invalidateQueries({
				queryKey: queryKeys.dashboard.summary(familyId),
			});
		}
	};

	const toggleMutation = useMutation({
		...toggleShoppingItemMutation({
			onSuccess: invalidateLists,
		}),
	});

	const addItemMutation = useMutation({
		mutationFn: ({ listId, name }: { listId: string; name: string }) =>
			api.shopping.items.add(listId, { name, quantity: 1 }),
		onSuccess: () => {
			invalidateLists();
			toast.success("Item added to list");
		},
		onError: () => toast.error("Failed to add item"),
	});

	const deleteListMutation = useMutation({
		...deleteShoppingListMutation({
			onSuccess: () => {
				invalidateLists();
				toast.success("Shopping list deleted");
			},
			onError: () => toast.error("Failed to delete shopping list"),
		}),
	});

	const updateListMutation = useMutation({
		...updateShoppingListMutation({
			onSuccess: () => {
				invalidateLists();
				setIsEditingTitle(false);
				setIsEditingNotes(false);
			},
		}),
	});

	const updateItemNameMutation = useMutation({
		...updateShoppingItemNameMutation({
			onSuccess: () => {
				invalidateLists();
				setEditingItemId(null);
			},
		}),
	});

	const deleteItemMutation = useMutation({
		mutationFn: (id: string) => api.shopping.items.delete(id),
		onSuccess: invalidateLists,
	});

	const handleAddItem = () => {
		const name = newItemInput.trim();
		if (!name) return;
		addItemMutation.mutate({ listId: list.id, name });
		setNewItemInput("");
	};

	const saveListTitle = () => {
		if (editingListName.trim() && editingListName !== list.name) {
			updateListMutation.mutate({ id: list.id, name: editingListName.trim() });
		} else {
			setIsEditingTitle(false);
			setEditingListName(list.name);
		}
	};

	const startEditingItem = (item: { id: string; name: string }) => {
		setEditingItemId(item.id);
		setEditingItemName(item.name);
	};

	const saveItemName = () => {
		if (editingItemId && editingItemName.trim()) {
			updateItemNameMutation.mutate({ id: editingItemId, name: editingItemName.trim() });
		} else {
			setEditingItemId(null);
		}
	};

	const saveListNotes = () => {
		updateListMutation.mutate({ id: list.id, notes: editingNotesValue.trim() || null });
	};

	return (
		<Card className="flex flex-col h-full">
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					{isEditingTitle ? (
						<div className="flex items-center gap-2 flex-1 mr-2">
							<Input
								value={editingListName}
								onChange={(e) => setEditingListName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") saveListTitle();
									if (e.key === "Escape") {
										setIsEditingTitle(false);
										setEditingListName(list.name);
									}
								}}
								autoFocus
								className="h-8"
							/>
							<Button size="icon" variant="ghost" onClick={saveListTitle} className="h-8 w-8">
								<CheckCircle className="w-4 h-4" />
							</Button>
						</div>
					) : (
						<CardTitle className="text-lg flex items-center gap-2">
							{list.pinned && <Pin className="w-3.5 h-3.5 text-primary fill-primary" />}
							{list.name}
							<Button
								size="icon"
								variant="ghost"
								className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
								onClick={() => {
									setIsEditingTitle(true);
									setEditingListName(list.name);
								}}
							>
								<Pencil className="w-3 h-3 text-muted-foreground" />
							</Button>
						</CardTitle>
					)}

					<div className="flex items-center gap-2">
						<Button
							size="icon"
							variant="ghost"
							className={cn(
								"h-8 w-8",
								list.pinned ? "text-primary" : "text-muted-foreground"
							)}
							onClick={() => updateListMutation.mutate({ id: list.id, pinned: !list.pinned })}
						>
							{list.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
						</Button>
						<Tabs
							value={viewMode}
							onValueChange={(val) => setViewMode(val as "inline" | "sectioned")}
							className="mr-1"
						>
							<TabsList className="h-7 p-0.5 bg-muted/50 border-none">
								<TabsTrigger value="inline" className="px-2 h-6 text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm">
									<ListIcon className="w-3 h-3" />
								</TabsTrigger>
								<TabsTrigger value="sectioned" className="px-2 h-6 text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm">
									<LayoutGrid className="w-3 h-3" />
								</TabsTrigger>
							</TabsList>
						</Tabs>
						<span className="text-sm font-normal text-muted-foreground mr-1">
							{list.items.filter((i) => i.checked).length}/
							{list.items.length}
						</span>
						<DropdownMenu>
							<DropdownMenuTrigger>
								<Button variant="ghost" size="icon" className="h-8 w-8">
									<MoreVertical className="w-4 h-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => updateListMutation.mutate({ id: list.id, pinned: !list.pinned })}>
									{list.pinned ? <PinOff className="w-4 h-4 mr-2" /> : <Pin className="w-4 h-4 mr-2" />}
									{list.pinned ? 'Unpin' : 'Pin to Home'}
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => {
									setIsEditingTitle(true);
									setEditingListName(list.name);
								}}>
									<Pencil className="w-4 h-4 mr-2" />
									Rename
								</DropdownMenuItem>
								<DropdownMenuItem
									className="text-destructive focus:text-destructive"
									onClick={() => {
										if (confirm('Are you sure you want to delete this list?')) {
											deleteListMutation.mutate(list.id);
										}
									}}
								>
									<Trash2 className="w-4 h-4 mr-2" />
									Delete
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-3 flex-1">
				{/* Add item input */}
				<div className="flex gap-2">
					<Input
						placeholder="Add item..."
						value={newItemInput}
						onChange={(e) => setNewItemInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
						className="text-sm"
					/>
					<Button
						size="sm"
						variant="secondary"
						onClick={handleAddItem}
						disabled={addItemMutation.isPending || !newItemInput.trim()}
					>
						<Plus className="w-4 h-4" />
					</Button>
				</div>

				{/* Items list */}
				<div className="space-y-4">
					{viewMode === "sectioned" ? (
						(() => {
							const grouped = list.items.reduce((acc, item) => {
								const category = inferCategory(item.name);
								if (!acc[category]) acc[category] = [];
								acc[category].push(item);
								return acc;
							}, {} as Record<string, typeof list.items>);

							// Sort categories by predefined order
							const categories = Object.keys(grouped).sort((a, b) => {
								const idxA = GROCERY_CATEGORIES.indexOf(a);
								const idxB = GROCERY_CATEGORIES.indexOf(b);
								if (idxA === -1) return 1;
								if (idxB === -1) return -1;
								return idxA - idxB;
							});

							return categories.map((category) => (
								<div key={category} className="space-y-1">
									<div className="flex items-center gap-2 px-1 mb-1 mt-3 first:mt-0">
										<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
											{category}
										</span>
										<div className="h-px bg-muted/60 flex-1" />
									</div>
									{grouped[category].map((item) => (
										<ItemRow
											key={item.id}
											item={item}
											isPending={toggleMutation.isPending}
											onToggle={() => toggleMutation.mutate(item.id)}
											onEdit={() => startEditingItem(item)}
											onDelete={() => deleteItemMutation.mutate(item.id)}
											isEditing={editingItemId === item.id}
											editingName={editingItemName}
											setEditingName={setEditingItemName}
											onSave={saveItemName}
											onCancel={() => setEditingItemId(null)}
										/>
									))}
								</div>
							));
						})()
					) : (
						<div className="space-y-1">
							{list.items.map((item) => (
								<ItemRow
									key={item.id}
									item={item}
									category={inferCategory(item.name)}
									isPending={toggleMutation.isPending}
									onToggle={() => toggleMutation.mutate(item.id)}
									onEdit={() => startEditingItem(item)}
									onDelete={() => deleteItemMutation.mutate(item.id)}
									isEditing={editingItemId === item.id}
									editingName={editingItemName}
									setEditingName={setEditingItemName}
									onSave={saveItemName}
									onCancel={() => setEditingItemId(null)}
								/>
							))}
						</div>
					)}
				</div>

				{/* List Notes */}
				{(list.notes || isEditingNotes) && (
					<div className="mt-4 pt-4 border-t border-dashed">
						<div className="flex items-center justify-between mb-2">
							<h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
								<FileText className="w-3 h-3" />
								List Notes
							</h4>
							{!isEditingNotes && (
								<Button
									size="icon"
									variant="ghost"
									className="h-6 w-6"
									onClick={() => {
										setIsEditingNotes(true);
										setEditingNotesValue(list.notes || "");
									}}
								>
									<Pencil className="w-3 h-3 text-muted-foreground" />
								</Button>
							)}
						</div>
						{isEditingNotes ? (
							<div className="space-y-2">
								<Textarea
									value={editingNotesValue}
									onChange={(e) => setEditingNotesValue(e.target.value)}
									placeholder="Add some notes to this list..."
									className="min-h-[80px] text-sm"
									autoFocus
								/>
								<div className="flex justify-end gap-2">
									<Button size="sm" variant="ghost" onClick={() => setIsEditingNotes(false)}>
										Cancel
									</Button>
									<Button size="sm" onClick={saveListNotes}>
										Save Notes
									</Button>
								</div>
							</div>
						) : (
							<p
								className="text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 rounded p-1 -ml-1"
								onClick={() => {
									setIsEditingNotes(true);
									setEditingNotesValue(list.notes || "");
								}}
							>
								{list.notes}
							</p>
						)}
					</div>
				)}

				{!list.notes && !isEditingNotes && (
					<div className="mt-4">
						<Button
							variant="ghost"
							size="sm"
							className="h-auto p-1 text-xs text-muted-foreground/60 hover:text-muted-foreground italic font-normal"
							onClick={() => {
								setIsEditingNotes(true);
								setEditingNotesValue(list.notes || "");
							}}
						>
							<FileText className="w-3 h-3 mr-1.5" />
							No notes yet. Click to add some.
						</Button>
					</div>
				)}

			</CardContent>
		</Card>
	);
}
