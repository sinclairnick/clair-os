import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, DollarSign, Check, Clock, AlertCircle } from "lucide-react";
import { useCurrentFamilyId } from "@/components/auth-provider";
import { api, type BillResponse, type BillCreateInput } from "@/lib/api";
import { format, isPast, isToday, addDays } from "date-fns";
import { PageTitle } from "@/components/page-title";
import { PageHeader, PageHeaderHeading, PageHeaderActions } from "@/components/page-header";

type BillFrequency = 'once' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly';

const frequencyLabels: Record<BillFrequency, string> = {
	once: 'One-time',
	weekly: 'Weekly',
	fortnightly: 'Fortnightly',
	monthly: 'Monthly',
	quarterly: 'Quarterly',
	yearly: 'Yearly',
};

export function BillsPage() {
	const familyId = useCurrentFamilyId();
	const queryClient = useQueryClient();

	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [newName, setNewName] = useState("");
	const [newDescription, setNewDescription] = useState("");
	const [newAmount, setNewAmount] = useState("");
	const [newDueDate, setNewDueDate] = useState("");
	const [newFrequency, setNewFrequency] = useState<BillFrequency>("once");

	const { data: bills, isLoading, error } = useQuery({
		queryKey: ['bills', familyId],
		queryFn: () => api.bills.list(familyId || ''),
		enabled: !!familyId,
	});

	const createMutation = useMutation({
		mutationFn: (data: BillCreateInput) => api.bills.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['bills', familyId] });
			queryClient.invalidateQueries({ queryKey: ['reminders', familyId] });
			setIsCreateDialogOpen(false);
			resetForm();
		},
	});

	const payMutation = useMutation({
		mutationFn: (id: string) => api.bills.pay(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['bills', familyId] });
			queryClient.invalidateQueries({ queryKey: ['reminders', familyId] });
		},
	});

	const resetForm = () => {
		setNewName("");
		setNewDescription("");
		setNewAmount("");
		setNewDueDate("");
		setNewFrequency("once");
	};

	const handleCreate = () => {
		if (!familyId || !newName.trim() || !newAmount || !newDueDate) return;

		createMutation.mutate({
			familyId,
			name: newName.trim(),
			description: newDescription.trim() || undefined,
			amount: parseFloat(newAmount),
			dueDate: new Date(newDueDate).toISOString(),
			frequency: newFrequency,
			createReminder: true,
			reminderDaysBefore: 3,
		});
	};

	if (!familyId) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Please select a family first</p>
			</div>
		);
	}

	// Separate bills by status
	const upcomingBills = bills?.filter(b => b.status === 'upcoming') || [];
	const paidBills = bills?.filter(b => b.status === 'paid') || [];

	return (
		<div className="space-y-6">
			<PageTitle title="Bills" />
			<PageHeader>
				<PageHeaderHeading title="Bills & Expenses" description="Track and manage household bills" />
				<PageHeaderActions>
					<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
						<DialogTrigger render={
							<Button>
								<Plus className="w-4 h-4 mr-2" />
								Add Bill
							</Button>
						}>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Add Bill</DialogTitle>
								<DialogDescription>
									Track a new bill or expense. A reminder will be created automatically.
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4">
								<Input
									placeholder="Bill name (e.g., Rent, Power)"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
								/>
								<Textarea
									placeholder="Description (optional)"
									value={newDescription}
									onChange={(e) => setNewDescription(e.target.value)}
									rows={2}
								/>
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<label className="text-sm font-medium">Amount (NZD)</label>
										<Input
											type="number"
											step="0.01"
											min="0"
											placeholder="0.00"
											value={newAmount}
											onChange={(e) => setNewAmount(e.target.value)}
										/>
									</div>
									<div className="space-y-2">
										<label className="text-sm font-medium">Due Date</label>
										<Input
											type="date"
											value={newDueDate}
											onChange={(e) => setNewDueDate(e.target.value)}
										/>
									</div>
								</div>
								<div className="space-y-2">
									<label className="text-sm font-medium">Frequency</label>
									<Select value={newFrequency} onValueChange={(v) => setNewFrequency(v as BillFrequency)}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(frequencyLabels).map(([value, label]) => (
												<SelectItem key={value} value={value}>{label}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							<DialogFooter>
								<Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
									Cancel
								</Button>
								<Button
									onClick={handleCreate}
									disabled={createMutation.isPending || !newName.trim() || !newAmount || !newDueDate}
								>
									{createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
									Add Bill
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
						<p className="text-destructive">Failed to load bills</p>
					</CardContent>
				</Card>
			)}

			{bills && bills.length === 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<DollarSign className="w-5 h-5" />
							No bills yet
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							Add bills to track expenses and get reminded before they're due.
						</p>
					</CardContent>
				</Card>
			)}

			{/* Upcoming bills */}
			{upcomingBills.length > 0 && (
				<div className="space-y-3">
					<h2 className="text-lg font-semibold flex items-center gap-2">
						<Clock className="w-5 h-5" />
						Upcoming
					</h2>
					{upcomingBills.map((bill) => (
						<BillCard
							key={bill.id}
							bill={bill}
							onPay={() => payMutation.mutate(bill.id)}
							isPending={payMutation.isPending}
						/>
					))}
				</div>
			)}

			{/* Paid bills */}
			{paidBills.length > 0 && (
				<div className="space-y-3">
					<h2 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
						<Check className="w-5 h-5" />
						Paid ({paidBills.length})
					</h2>
					{paidBills.slice(0, 5).map((bill) => (
						<BillCard
							key={bill.id}
							bill={bill}
							onPay={() => { }}
							isPending={false}
							isPaid
						/>
					))}
				</div>
			)}
		</div>
	);
}

function BillCard({
	bill,
	onPay,
	isPending,
	isPaid = false,
}: {
	bill: BillResponse;
	onPay: () => void;
	isPending: boolean;
	isPaid?: boolean;
}) {
	const dueDate = new Date(bill.dueDate);
	const isOverdue = isPast(dueDate) && !isToday(dueDate) && !isPaid;
	const isDueToday = isToday(dueDate);
	const isDueSoon = !isPaid && !isOverdue && !isDueToday && dueDate <= addDays(new Date(), 7);

	return (
		<Card className={`transition-colors ${isPaid ? "opacity-60" : isOverdue ? "border-destructive/50" : ""}`}>
			<CardContent className="flex items-center gap-4 p-4">
				<div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPaid ? "bg-secondary" :
					isOverdue ? "bg-destructive/10 text-destructive" :
						isDueSoon ? "bg-accent/10 text-accent-foreground" :
							"bg-muted"
					}`}>
					{isPaid ? <Check className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
				</div>

				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<span className={`font-medium ${isPaid ? "line-through" : ""}`}>{bill.name}</span>
						{bill.frequency !== 'once' && (
							<Badge variant="outline" className="text-xs">
								{frequencyLabels[bill.frequency]}
							</Badge>
						)}
					</div>
					<div className="flex items-center gap-3 mt-1 text-sm">
						<span className="font-semibold text-foreground">
							${bill.amount.toFixed(2)} {bill.currency}
						</span>
						<span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-destructive" :
							isDueToday ? "text-accent-foreground" :
								isDueSoon ? "text-yellow-600" :
									"text-muted-foreground"
							}`}>
							{isOverdue && <AlertCircle className="w-3 h-3" />}
							<Clock className="w-3 h-3" />
							{isPaid ? "Paid" : isOverdue ? "Overdue: " : isDueToday ? "Due today" : "Due "}
							{!isPaid && !isDueToday && format(dueDate, "MMM d")}
							{isPaid && bill.paidAt && ` on ${format(new Date(bill.paidAt), "MMM d")}`}
						</span>
					</div>
				</div>

				{!isPaid && (
					<Button
						size="sm"
						onClick={onPay}
						disabled={isPending}
					>
						{isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mark Paid"}
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
