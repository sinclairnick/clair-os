
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useCurrentFamilyId } from "@/components/auth-provider";
import { createShoppingListMutation, queryKeys } from "@/lib/queries";
import { toast } from "sonner";

interface CreateShoppingListDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultPinned?: boolean;
}

export function CreateShoppingListDialog({ open, onOpenChange, defaultPinned = false }: CreateShoppingListDialogProps) {
	const familyId = useCurrentFamilyId();
	const queryClient = useQueryClient();
	const [newListName, setNewListName] = useState("");
	const [isPinned, setIsPinned] = useState(defaultPinned);

	// Update isPinned when defaultPinned changes or dialog opens
	// However, usually defaultPinned is static. 
	// To be safe we can use useEffect or just rely on initial state if component remounts.
	// Since Dialog is likely conditionally rendered or kept mounted, let's sync state when it opens.
	// Actually, easier to key the component or just use internal state that resets.
	// Let's reset in onOpenChange. Note: onOpenChange(false) closes it.
	// We should reset form state when opening? 
	// For now, let's just initialize state. If defaultPinned changes it won't update, which is acceptable.

	const createListMutation = useMutation({
		...createShoppingListMutation({
			onSuccess: () => {
				if (familyId) {
					queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary(familyId) });
					queryClient.invalidateQueries({ queryKey: queryKeys.shopping.lists(familyId) });
				}
				onOpenChange(false);
				setNewListName("");
				setIsPinned(defaultPinned); // Reset to default
				toast.success("Shopping list created");
			},
			onError: () => toast.error("Failed to create shopping list"),
		}),
	});

	const handleCreateList = () => {
		if (!familyId || !newListName.trim()) return;
		createListMutation.mutate({ familyId, name: newListName.trim(), pinned: isPinned });
	};

	return (
		<Dialog open={open} onOpenChange={(val) => {
			if (!val) {
				setNewListName("");
				setIsPinned(defaultPinned);
			}
			onOpenChange(val);
		}}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Shopping List</DialogTitle>
					<DialogDescription>
						Give your new shopping list a name.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<Input
						placeholder="e.g., Weekly Groceries"
						value={newListName}
						onChange={(e) => setNewListName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
					/>
					<div className="flex items-center space-x-2">
						<Checkbox
							id="pinned"
							checked={isPinned}
							onCheckedChange={(checked) => setIsPinned(checked as boolean)}
						/>
						<Label htmlFor="pinned" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
							Pin this list
						</Label>
					</div>
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						onClick={handleCreateList}
						disabled={createListMutation.isPending || !newListName.trim()}
					>
						{createListMutation.isPending && (
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
						)}
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
