import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, Loader2, LinkIcon, CheckCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { queryKeys, createFamilyMutation } from "@/lib/queries";
import { PageTitle } from "@/components/page-title";

export function FamilySelectPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const queryClient = useQueryClient();
	const { families, setCurrentFamilyId, isLoading: authLoading } = useAuth();

	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
	const [newFamilyName, setNewFamilyName] = useState("");
	const [inviteCode, setInviteCode] = useState("");
	const [joinError, setJoinError] = useState<string | null>(null);
	const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

	// Check for invite code in URL
	useEffect(() => {
		const code = searchParams.get('invite');
		if (code) {
			setInviteCode(code);
			setIsJoinDialogOpen(true);
		}
	}, [searchParams]);

	const createMutation = useMutation({
		...createFamilyMutation({
			onSuccess: (data) => {
				queryClient.invalidateQueries({ queryKey: queryKeys.families.all });
				setCurrentFamilyId(data.id);
				setIsCreateDialogOpen(false);
				setNewFamilyName("");
				navigate('/');
			},
		}),
	});

	const joinMutation = useMutation({
		mutationFn: (code: string) => api.families.join(code),
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.families.all });
			setJoinSuccess(`Joined ${data.familyName} as ${data.role}!`);
			setJoinError(null);
			setTimeout(() => {
				setCurrentFamilyId(data.familyId);
				setIsJoinDialogOpen(false);
				navigate('/');
			}, 1500);
		},
		onError: (error: Error) => {
			setJoinError(error.message);
			setJoinSuccess(null);
		},
	});

	const handleSelectFamily = (familyId: string) => {
		setCurrentFamilyId(familyId);
		navigate('/');
	};

	const handleCreateFamily = () => {
		if (!newFamilyName.trim()) return;
		createMutation.mutate({ name: newFamilyName.trim() });
	};

	const handleJoinFamily = () => {
		if (!inviteCode.trim()) return;
		joinMutation.mutate(inviteCode.trim());
	};

	if (authLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background p-4">
			<PageTitle title="Select Family" />
			<div className="max-w-2xl mx-auto pt-12">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-primary mb-2">Welcome to ClairOS</h1>
					<p className="text-muted-foreground">
						{families.length > 0
							? "Select a family to continue or create a new one"
							: "Create your first family or join an existing one"
						}
					</p>
				</div>

				{/* Existing families */}
				{families.length > 0 && (
					<div className="space-y-3 mb-8">
						<h2 className="text-lg font-semibold">Your Families</h2>
						{families.map((family) => (
							<Card
								key={family.id}
								className="cursor-pointer hover:border-primary transition-colors"
								onClick={() => handleSelectFamily(family.id)}
							>
								<CardContent className="flex items-center gap-4 p-4">
									<div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
										<Users className="w-6 h-6 text-primary" />
									</div>
									<div className="flex-1">
										<h3 className="font-medium">{family.name}</h3>
										<p className="text-sm text-muted-foreground capitalize">
											{family.role} · {family.displayName}
										</p>
									</div>
									<Button variant="ghost" size="sm">Select</Button>
								</CardContent>
							</Card>
						))}
					</div>
				)}

				{/* Actions */}
				<div className="grid gap-4 sm:grid-cols-2">
					{/* Create Family Dialog */}
					<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
						<DialogTrigger>
							<Card className="cursor-pointer hover:border-primary transition-colors">
								<CardHeader className="text-center pb-2">
									<div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
										<Plus className="w-6 h-6 text-primary" />
									</div>
									<CardTitle className="text-lg">Create Family</CardTitle>
									<CardDescription>Start a new family group</CardDescription>
								</CardHeader>
							</Card>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Create a New Family</DialogTitle>
								<DialogDescription>
									Give your family a name. You'll be the admin.
								</DialogDescription>
							</DialogHeader>
							<Input
								placeholder="e.g., The Smiths"
								value={newFamilyName}
								onChange={(e) => setNewFamilyName(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleCreateFamily()}
							/>
							<DialogFooter>
								<Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
									Cancel
								</Button>
								<Button
									onClick={handleCreateFamily}
									disabled={createMutation.isPending || !newFamilyName.trim()}
								>
									{createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
									Create
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					{/* Join Family Dialog */}
					<Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
						<DialogTrigger>
							<Card className="cursor-pointer hover:border-primary transition-colors">
								<CardHeader className="text-center pb-2">
									<div className="w-12 h-12 mx-auto rounded-full bg-secondary/50 flex items-center justify-center mb-2">
										<LinkIcon className="w-6 h-6 text-secondary-foreground" />
									</div>
									<CardTitle className="text-lg">Join Family</CardTitle>
									<CardDescription>Have an invite code?</CardDescription>
								</CardHeader>
							</Card>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Join a Family</DialogTitle>
								<DialogDescription>
									Enter the invite code you received from a family admin.
								</DialogDescription>
							</DialogHeader>
							{joinSuccess ? (
								<div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
									<CheckCircle className="w-5 h-5 text-primary" />
									<span className="text-primary">{joinSuccess}</span>
								</div>
							) : (
								<>
									<Input
										placeholder="Enter invite code"
										value={inviteCode}
										onChange={(e) => setInviteCode(e.target.value)}
										onKeyDown={(e) => e.key === "Enter" && handleJoinFamily()}
									/>
									{joinError && (
										<p className="text-sm text-destructive">{joinError}</p>
									)}
								</>
							)}
							<DialogFooter>
								<Button variant="outline" onClick={() => setIsJoinDialogOpen(false)}>
									Cancel
								</Button>
								{!joinSuccess && (
									<Button
										onClick={handleJoinFamily}
										disabled={joinMutation.isPending || !inviteCode.trim()}
									>
										{joinMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
										Join
									</Button>
								)}
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>
			</div>
		</div>
	);
}
