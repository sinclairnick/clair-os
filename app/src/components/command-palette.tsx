import * as React from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
	CommandDialog,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
} from "@/components/ui/command";
import {
	CookingPot,
	ShoppingCart,
	CheckSquare,
	Bell,
	DollarSign,
	Loader2,
} from "lucide-react";
import { useCurrentFamilyId } from "@/components/auth-provider";
import { searchQuery } from "@/lib/queries";
import { useDebounce } from "@/hooks/use-debounce";
import { ROUTES } from "@/lib/routes";
import { Badge } from "@/components/ui/badge";
import { CreateShoppingListDialog } from "@/components/create-shopping-list-dialog";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { CreateReminderDialog } from "@/components/create-reminder-dialog";
import { RecipeImportDialog } from "@/components/recipe-import-dialog";
import { cn } from "@/lib/utils";
import { formatRelative } from "date-fns";

interface CommandPaletteProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
	const navigate = useNavigate();
	const familyId = useCurrentFamilyId();
	const [query, setQuery] = React.useState("");
	const debouncedQuery = useDebounce(query, 300);

	// Dialog states
	const [showRecipeImport, setShowRecipeImport] = React.useState(false);
	const [showCreateShoppingList, setShowCreateShoppingList] = React.useState(false);
	const [showCreateTask, setShowCreateTask] = React.useState(false);
	const [showCreateReminder, setShowCreateReminder] = React.useState(false);

	const { data, isLoading } = useQuery(
		searchQuery(familyId || "", debouncedQuery, {
			enabled: !!familyId && debouncedQuery.length >= 2,
		})
	);

	React.useEffect(() => {
		if (!open) {
			setQuery("");
		}
	}, [open]);


	const runCommand = (command: () => void) => {
		onOpenChange(false);
		command();
	};

	return (
		<>
			<CommandDialog
				open={open}
				onOpenChange={onOpenChange}
				shouldFilter={debouncedQuery.length < 2}
			>
				<CommandInput
					placeholder="Search recipes, tasks, lists..."
					value={query}
					onValueChange={setQuery}
				/>
				<CommandList>
					<CommandEmpty>
						{isLoading ? (
							<div className="flex items-center justify-center py-6 text-muted-foreground">
								<Loader2 className="w-4 h-4 animate-spin mr-2" />
								Searching...
							</div>
						) : (
							"No results found."
						)}
					</CommandEmpty>

					{debouncedQuery.length < 2 && (
						<CommandGroup heading="Quick Actions">
							<CommandItem onSelect={() => runCommand(() => setShowRecipeImport(true))}>
								<CookingPot className="mr-2 h-4 w-4" />
								<span>New Recipe</span>
							</CommandItem>
							<CommandItem onSelect={() => runCommand(() => setShowCreateShoppingList(true))}>
								<ShoppingCart className="mr-2 h-4 w-4" />
								<span>New Shopping List</span>
							</CommandItem>
							<CommandItem onSelect={() => runCommand(() => setShowCreateTask(true))}>
								<CheckSquare className="mr-2 h-4 w-4" />
								<span>New Task</span>
							</CommandItem>
							<CommandItem onSelect={() => runCommand(() => setShowCreateReminder(true))}>
								<Bell className="mr-2 h-4 w-4" />
								<span>New Reminder</span>
							</CommandItem>
						</CommandGroup>
					)}

					{data?.recipes && data.recipes.length > 0 && (
						<CommandGroup heading="Recipes">
							{data.recipes.map((recipe) => (
								<CommandItem
									key={recipe.id}
									onSelect={() => runCommand(() => navigate(ROUTES.RECIPE_DETAIL(recipe.id)))}
								>
									<div className="flex items-center gap-3 flex-1 overflow-hidden">
										<div className="h-8 w-8 rounded bg-muted overflow-hidden flex-shrink-0 border border-border/50">
											{recipe.imageUrl ? (
												<img src={recipe.imageUrl} alt="" className="h-full w-full object-cover" />
											) : (
												<CookingPot className="h-full w-full p-1.5 text-muted-foreground/30" />
											)}
										</div>
										<span className="truncate">{recipe.title}</span>
										{recipe.cookTimeMinutes ? (
											<Badge variant="outline" className="ml-auto text-[10px] h-4">
												{recipe.cookTimeMinutes}m
											</Badge>
										) : null}
									</div>
								</CommandItem>
							))}
						</CommandGroup>
					)}

					{data?.shoppingLists && data.shoppingLists.length > 0 && (
						<CommandGroup heading="Shopping Lists">
							{data.shoppingLists.map((list) => (
								<CommandItem
									key={list.id}
									onSelect={() => runCommand(() => navigate(ROUTES.SHOPPING))}
								>
									<ShoppingCart className="mr-2 h-4 w-4 text-muted-foreground" />
									<span className="flex-1 truncate">{list.name}</span>
									<Badge variant="secondary" className="text-[10px] h-4">
										{list.itemCount} items
									</Badge>
								</CommandItem>
							))}
						</CommandGroup>
					)}

					{data?.tasks && data.tasks.length > 0 && (
						<CommandGroup heading="Tasks">
							{data.tasks.map((task) => (
								<CommandItem
									key={task.id}
									onSelect={() => runCommand(() => navigate(ROUTES.TASKS))}
								>
									<CheckSquare className={cn(
										"mr-2 h-4 w-4",
										task.priority === 'high' ? "text-destructive" : "text-muted-foreground"
									)} />
									<span className="flex-1 truncate">{task.title}</span>
									{task.status !== 'todo' && (
										<Badge variant="outline" className="capitalize text-[10px] h-4">
											{task.status.replace('_', ' ')}
										</Badge>
									)}
								</CommandItem>
							))}
						</CommandGroup>
					)}

					{data?.reminders && data.reminders.length > 0 && (
						<CommandGroup heading="Reminders">
							{data.reminders.map((reminder) => (
								<CommandItem
									key={reminder.id}
									onSelect={() => runCommand(() => navigate(ROUTES.REMINDERS))}
								>
									<Bell className="mr-2 h-4 w-4 text-muted-foreground" />
									<span className="flex-1 truncate">{reminder.title}</span>
									<span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
										{formatRelative(new Date(reminder.remindAt), new Date())}
									</span>
								</CommandItem>
							))}
						</CommandGroup>
					)}

					{data?.bills && data.bills.length > 0 && (
						<CommandGroup heading="Bills">
							{data.bills.map((bill) => (
								<CommandItem
									key={bill.id}
									onSelect={() => runCommand(() => navigate(ROUTES.BILLS))}
								>
									<DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
									<span className="flex-1 truncate">{bill.name}</span>
									<span className="text-[10px] text-muted-foreground ml-auto">
										${bill.amount}
									</span>
								</CommandItem>
							))}
						</CommandGroup>
					)}
				</CommandList>
			</CommandDialog>

			<RecipeImportDialog
				open={showRecipeImport}
				onOpenChange={setShowRecipeImport}
			/>
			<CreateShoppingListDialog
				open={showCreateShoppingList}
				onOpenChange={setShowCreateShoppingList}
			/>
			<CreateTaskDialog
				open={showCreateTask}
				onOpenChange={setShowCreateTask}
			/>
			<CreateReminderDialog
				open={showCreateReminder}
				onOpenChange={setShowCreateReminder}
			/>
		</>
	);
}
