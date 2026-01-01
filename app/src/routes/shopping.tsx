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
import { Plus, Loader2, ShoppingBag, CheckCircle, Trash2 } from "lucide-react";
import { useCurrentFamilyId } from "@/components/auth-provider";
import {
	shoppingListsQuery,
	queryKeys,
	createShoppingListMutation,
	deleteShoppingListMutation,
} from "@/lib/queries";
import { toast } from "sonner";
import { PageTitle } from "@/components/page-title";
import { PageHeader, PageHeaderHeading, PageHeaderActions } from "@/components/page-header";
import { ShoppingListCard } from "@/components/shopping-list-card";

export function ShoppingPage() {
	const familyId = useCurrentFamilyId();
	const queryClient = useQueryClient();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [newListName, setNewListName] = useState("");

	const { data: lists, isLoading, error } = useQuery(
		shoppingListsQuery(familyId || "", {
			enabled: !!familyId,
		})
	);

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

	const handleCreateList = () => {
		if (!familyId || !newListName.trim()) return;
		createListMutation.mutate({ familyId, name: newListName.trim() });
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
						} />
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
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
						{activeLists.map((list) => (
							<ShoppingListCard key={list.id} list={list} />
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
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
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
