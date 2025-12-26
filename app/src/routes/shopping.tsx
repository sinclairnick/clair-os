import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Loader2, ShoppingBag, CheckCircle, Trash2, MoreVertical, Pencil } from "lucide-react";
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
			},
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
		},
	});

	const deleteListMutation = useMutation({
		...deleteShoppingListMutation({
			onSuccess: () => {
				if (familyId) {
					queryClient.invalidateQueries({
						queryKey: queryKeys.shopping.lists(familyId),
					});
				}
			},
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
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Shopping Lists</h1>
					<p className="text-muted-foreground">
						Manage your grocery and shopping lists
					</p>
				</div>
				<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="w-4 h-4 mr-2" />
							New List
						</Button>
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
			</div>

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
											<span className="text-sm font-normal text-muted-foreground">
												{list.items.filter((i) => i.checked).length}/
												{list.items.length}
											</span>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
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
									<div className="space-y-1">
										{list.items.map((item) => (
											<div
												key={item.id}
												className="flex items-center gap-3 py-1 group"
											>
												<Checkbox
													checked={item.checked}
													disabled={toggleMutation.isPending}
													onCheckedChange={() => toggleMutation.mutate(item.id)}
												/>

												{editingItemId === item.id ? (
													<div className="flex items-center gap-1 flex-1">
														<Input
															value={editingItemName}
															onChange={(e) => setEditingItemName(e.target.value)}
															onBlur={saveItemName}
															onKeyDown={(e) => {
																if (e.key === "Enter") saveItemName();
																if (e.key === "Escape") setEditingItemId(null);
															}}
															autoFocus
															className="h-7 text-sm"
														/>
													</div>
												) : (
													<span
														className={`flex-1 cursor-pointer hover:bg-muted/50 rounded px-1 -ml-1 py-0.5 ${item.checked
															? "line-through text-muted-foreground"
															: ""
															}`}
														onClick={() => startEditingItem(item)}
													>
														{item.quantity > 1 && `${item.quantity}x `}
														{item.name}
														{item.unit && ` (${item.unit})`}
													</span>
												)}

												<Button
													size="icon"
													variant="ghost"
													className="opacity-0 group-hover:opacity-100 h-6 w-6"
													onClick={() => deleteItemMutation.mutate(item.id)}
													disabled={deleteItemMutation.isPending}
												>
													<Trash2 className="w-3 h-3 text-muted-foreground" />
												</Button>
											</div>
										))}
									</div>

									{list.items.length === 0 && (
										<p className="text-sm text-muted-foreground text-center py-2">
											No items yet - add some above!
										</p>
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
