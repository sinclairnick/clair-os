import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Loader2, ShoppingBag, CheckCircle, Trash2, MoreVertical, Pencil, FileText, LayoutGrid, List as ListIcon } from "lucide-react";
import { useCurrentFamilyId } from "@/components/auth-provider";
import {
	shoppingListsQuery,
	queryKeys,
	toggleShoppingItemMutation,
	createShoppingListMutation,
	deleteShoppingListMutation,
	updateShoppingListMutation,
	updateShoppingItemNameMutation,
} from "@/lib/queries";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { PageTitle } from "@/components/page-title";
import { PageHeader, PageHeaderHeading, PageHeaderActions } from "@/components/page-header";
import { Textarea } from "@/components/ui/textarea";
import { inferCategory, GROCERY_CATEGORIES } from "@clairos/shared";
import { ItemRow } from "./shopping-item-row";

export function ShoppingPage() {
	const familyId = useCurrentFamilyId();
	const queryClient = useQueryClient();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [newListName, setNewListName] = useState("");
	const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});

	// Editing states
	const [editingListId, setEditingListId] = useState<string | null>(null);
	const [editingListName, setEditingListName] = useState("");
	const [editingItemId, setEditingItemId] = useState<string | null>(null);
	const [editingItemName, setEditingItemName] = useState("");
	const [editingNotesListId, setEditingNotesListId] = useState<string | null>(null);
	const [editingNotesValue, setEditingNotesValue] = useState("");
	const [listViewModes, setListViewModes] = useState<Record<string, "inline" | "sectioned">>({});

	const { data: lists, isLoading, error } = useQuery(
		shoppingListsQuery(familyId || "", {
			enabled: !!familyId,
		})
	);

	const toggleMutation = useMutation({
		...toggleShoppingItemMutation({
			onSuccess: () => {
				if (familyId) {
					queryClient.invalidateQueries({
						queryKey: queryKeys.shopping.lists(familyId),
					});
				}
			},
		}),
	});


	const createListMutation = useMutation({
		...createShoppingListMutation({
			onSuccess: () => {
				if (familyId) {
					queryClient.invalidateQueries({
						queryKey: queryKeys.shopping.lists(familyId),
					});
				}
				setIsCreateDialogOpen(false);
				setNewListName("");
				toast.success("Shopping list created");
			},
			onError: () => toast.error("Failed to create shopping list"),
		}),
	});

	const addItemMutation = useMutation({
		mutationFn: ({ listId, name }: { listId: string; name: string }) =>
			api.shopping.items.add(listId, { name, quantity: 1 }),
		onSuccess: () => {
			if (familyId) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.shopping.lists(familyId),
				});
			}
			toast.success("Item added to list");
		},
		onError: () => toast.error("Failed to add item"),
	});

	const deleteListMutation = useMutation({
		...deleteShoppingListMutation({
			onSuccess: () => {
				if (familyId) {
					queryClient.invalidateQueries({
						queryKey: queryKeys.shopping.lists(familyId),
					});
				}
				toast.success("Shopping list deleted");
			},
			onError: () => toast.error("Failed to delete shopping list"),
		}),
	});

	const updateListMutation = useMutation({
		...updateShoppingListMutation({
			onSuccess: () => {
				if (familyId) {
					queryClient.invalidateQueries({
						queryKey: queryKeys.shopping.lists(familyId),
					});
				}
				setEditingListId(null);
			},
		}),
	});

	const updateItemNameMutation = useMutation({
		...updateShoppingItemNameMutation({
			onSuccess: () => {
				if (familyId) {
					queryClient.invalidateQueries({
						queryKey: queryKeys.shopping.lists(familyId),
					});
				}
				setEditingItemId(null);
			},
		}),
	});

	const deleteItemMutation = useMutation({
		mutationFn: (id: string) => api.shopping.items.delete(id),
		onSuccess: () => {
			if (familyId) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.shopping.lists(familyId),
				});
			}
		},
	});

	const handleCreateList = () => {
		if (!familyId || !newListName.trim()) return;
		createListMutation.mutate({ familyId, name: newListName.trim() });
	};

	const handleAddItem = (listId: string) => {
		const itemName = newItemInputs[listId]?.trim();
		if (!itemName) return;
		addItemMutation.mutate({ listId, name: itemName });
		setNewItemInputs((prev) => ({ ...prev, [listId]: "" }));
	};

	const startEditingList = (list: { id: string; name: string }) => {
		setEditingListId(list.id);
		setEditingListName(list.name);
	};

	const saveListTitle = () => {
		if (editingListId && editingListName.trim()) {
			updateListMutation.mutate({ id: editingListId, name: editingListName.trim() });
		} else {
			setEditingListId(null);
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

	const startEditingNotes = (list: { id: string; notes?: string | null }) => {
		setEditingNotesListId(list.id);
		setEditingNotesValue(list.notes || "");
	};

	const saveListNotes = () => {
		if (editingNotesListId) {
			updateListMutation.mutate({ id: editingNotesListId, notes: editingNotesValue.trim() || null });
			setEditingNotesListId(null);
		}
	};

	if (!familyId) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Please select a family first</p>
			</div>
		);
	}

	// Filter to active lists
	const activeLists = lists?.filter((l) => l.status === "active") || [];
	const completedLists = lists?.filter((l) => l.status === "completed") || [];

	return (
		<div className="space-y-6">
			<PageTitle title="Shopping" />
			<PageHeader>
				<PageHeaderHeading title="Shopping Lists" description="Manage your grocery and shopping lists" />
				<PageHeaderActions>
					<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
						<DialogTrigger render={
							<Button>
								<Plus className="w-4 h-4 mr-2" />
								New List
							</Button>
						}>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Create Shopping List</DialogTitle>
								<DialogDescription>
									Give your new shopping list a name.
								</DialogDescription>
							</DialogHeader>
							<Input
								placeholder="e.g., Weekly Groceries"
								value={newListName}
								onChange={(e) => setNewListName(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
							/>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setIsCreateDialogOpen(false)}
								>
									Cancel
								</Button>
								<Button
									onClick={handleCreateList}
									disabled={
										createListMutation.isPending || !newListName.trim()
									}
								>
									{createListMutation.isPending && (
										<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									)}
									Create
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</PageHeaderActions>
			</PageHeader>

			{isLoading && (
				<div className="flex items-center justify-center h-64">
					<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
				</div>
			)}

			{error && (
				<Card className="border-destructive">
					<CardContent className="pt-6">
						<p className="text-destructive">
							Failed to load shopping lists: {error.message}
						</p>
					</CardContent>
				</Card>
			)}

			{lists && lists.length === 0 && (
				<Card>
					<CardHeader>
						<CardTitle>No shopping lists</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							Create a shopping list to get started. Items can be added manually
							or generated from recipes.
						</p>
					</CardContent>
				</Card>
			)}

			{activeLists.length > 0 && (
				<div className="space-y-4">
					<h2 className="text-lg font-semibold flex items-center gap-2">
						<ShoppingBag className="w-5 h-5" />
						Active Lists
					</h2>
					<div className="grid gap-4 sm:grid-cols-2">
						{activeLists.map((list) => (
							<Card key={list.id}>
								<CardHeader className="pb-2">
									<div className="flex items-center justify-between">
										{editingListId === list.id ? (
											<div className="flex items-center gap-2 flex-1 mr-2">
												<Input
													value={editingListName}
													onChange={(e) => setEditingListName(e.target.value)}
													onKeyDown={(e) => {
														if (e.key === "Enter") saveListTitle();
														if (e.key === "Escape") setEditingListId(null);
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
												{list.name}
												<Button
													size="icon"
													variant="ghost"
													className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
													onClick={() => startEditingList(list)}
												>
													<Pencil className="w-3 h-3 text-muted-foreground" />
												</Button>
											</CardTitle>
										)}

										<div className="flex items-center gap-2">
											<Tabs
												value={listViewModes[list.id] || "inline"}
												onValueChange={(val) => setListViewModes(prev => ({ ...prev, [list.id]: val as "inline" | "sectioned" }))}
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
													<DropdownMenuItem onClick={() => startEditingList(list)}>
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
								<CardContent className="space-y-3">
									{/* Add item input */}
									<div className="flex gap-2">
										<Input
											placeholder="Add item..."
											value={newItemInputs[list.id] || ""}
											onChange={(e) =>
												setNewItemInputs((prev) => ({
													...prev,
													[list.id]: e.target.value,
												}))
											}
											onKeyDown={(e) =>
												e.key === "Enter" && handleAddItem(list.id)
											}
											className="text-sm"
										/>
										<Button
											size="sm"
											variant="secondary"
											onClick={() => handleAddItem(list.id)}
											disabled={
												addItemMutation.isPending ||
												!newItemInputs[list.id]?.trim()
											}
										>
											<Plus className="w-4 h-4" />
										</Button>
									</div>

									{/* Items list */}
									<div className="space-y-4">
										{listViewModes[list.id] === "sectioned" ? (
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
									{(list.notes || editingNotesListId === list.id) && (
										<div className="mt-4 pt-4 border-t border-dashed">
											<div className="flex items-center justify-between mb-2">
												<h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
													<FileText className="w-3 h-3" />
													List Notes
												</h4>
												{editingNotesListId !== list.id && (
													<Button
														size="icon"
														variant="ghost"
														className="h-6 w-6"
														onClick={() => startEditingNotes(list)}
													>
														<Pencil className="w-3 h-3 text-muted-foreground" />
													</Button>
												)}
											</div>
											{editingNotesListId === list.id ? (
												<div className="space-y-2">
													<Textarea
														value={editingNotesValue}
														onChange={(e) => setEditingNotesValue(e.target.value)}
														placeholder="Add some notes to this list..."
														className="min-h-[80px] text-sm"
														autoFocus
													/>
													<div className="flex justify-end gap-2">
														<Button size="sm" variant="ghost" onClick={() => setEditingNotesListId(null)}>
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
													onClick={() => startEditingNotes(list)}
												>
													{list.notes}
												</p>
											)}
										</div>
									)}

									{!list.notes && editingNotesListId !== list.id && (
										<div className="mt-4">
											<Button
												variant="ghost"
												size="sm"
												className="h-auto p-1 text-xs text-muted-foreground/60 hover:text-muted-foreground italic font-normal"
												onClick={() => startEditingNotes(list)}
											>
												<FileText className="w-3 h-3 mr-1.5" />
												No notes yet. Click to add some.
											</Button>
										</div>
									)}

								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}

			{completedLists.length > 0 && (
				<div className="space-y-4">
					<h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
						<CheckCircle className="w-5 h-5" />
						Completed ({completedLists.length})
					</h2>
					<div className="grid gap-4 sm:grid-cols-2">
						{completedLists.map((list) => (
							<Card key={list.id} className="opacity-60">
								<CardHeader className="pb-2">
									<div className="flex items-center justify-between">
										<CardTitle className="text-lg">{list.name}</CardTitle>
										<Button
											size="icon"
											variant="ghost"
											className="h-8 w-8"
											onClick={() => {
												if (confirm('Are you sure you want to delete this list?')) {
													deleteListMutation.mutate(list.id);
												}
											}}
										>
											<Trash2 className="w-4 h-4" />
										</Button>
									</div>
								</CardHeader>
								<CardContent>
									<p className="text-sm text-muted-foreground">
										{list.items.length} items completed
									</p>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
