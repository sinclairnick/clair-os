import { useState } from "react";
import { Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Copy, Trash2, UserCircle, Link as LinkIcon, Check, Users, ChevronRight } from "lucide-react";
import { useCurrentFamilyId, useAuth } from "@/components/auth-provider";
import { api, type FamilyMemberResponse, type InviteResponse } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { PageTitle } from "@/components/page-title";

export function FamilyManagePage() {
	const familyId = useCurrentFamilyId();
	const { currentFamily } = useAuth();
	const queryClient = useQueryClient();
	const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
	const [inviteRole, setInviteRole] = useState<"admin" | "member" | "child">("member");
	const [copiedCode, setCopiedCode] = useState<string | null>(null);

	// Query for members
	const { data: members, isLoading: membersLoading } = useQuery({
		queryKey: ["family-members", familyId],
		queryFn: () => api.families.getMembers(familyId!),
		enabled: !!familyId,
	});

	// Query for invites
	const { data: invites, isLoading: invitesLoading } = useQuery({
		queryKey: ["family-invites", familyId],
		queryFn: () => api.families.getInvites(familyId!),
		enabled: !!familyId && currentFamily?.role === "admin",
	});

	const createInviteMutation = useMutation({
		mutationFn: (role: string) => api.families.createInvite(familyId!, { role }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["family-invites", familyId] });
			setIsInviteDialogOpen(false);
		},
	});

	const deleteInviteMutation = useMutation({
		mutationFn: (inviteId: string) => api.families.deleteInvite(familyId!, inviteId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["family-invites", familyId] });
		},
	});

	const updateMemberMutation = useMutation({
		mutationFn: ({ userId, role }: { userId: string; role: string }) =>
			api.families.updateMember(familyId!, userId, { role }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["family-members", familyId] });
		},
	});

	const removeMemberMutation = useMutation({
		mutationFn: (userId: string) => api.families.removeMember(familyId!, userId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["family-members", familyId] });
		},
	});

	const handleCopyInviteLink = (invite: InviteResponse) => {
		const inviteUrl = `${window.location.origin}/family?invite=${invite.code}`;
		navigator.clipboard.writeText(inviteUrl);
		setCopiedCode(invite.code);
		setTimeout(() => setCopiedCode(null), 2000);
	};

	const isAdmin = currentFamily?.role === "admin";

	if (!familyId) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Please select a family first</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageTitle title="Family Management" />
			<div>
				<h1 className="text-2xl font-bold text-foreground">
					{currentFamily?.name} Settings
				</h1>
				<p className="text-muted-foreground">
					Manage family members and invite links
				</p>
			</div>

			{/* Members Section */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="w-5 h-5" />
						Family Members
					</CardTitle>
					<CardDescription>
						{members?.length || 0} member{(members?.length || 0) !== 1 ? "s" : ""}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					{membersLoading ? (
						<div className="flex justify-center py-4">
							<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
						</div>
					) : (
						members?.map((member) => (
							<div
								key={member.userId}
								className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30"
							>
								{member.image ? (
									<img
										src={member.image}
										alt={member.name}
										className="w-10 h-10 rounded-full"
									/>
								) : (
									<div
										className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
										style={{ backgroundColor: member.color }}
									>
										{member.name.charAt(0).toUpperCase()}
									</div>
								)}
								<Link
									to={ROUTES.MEMBER_PROFILE(member.userId)}
									className="flex-1 min-w-0 hover:underline group"
								>
									<div className="flex items-center gap-1">
										<p className="font-medium truncate group-hover:text-primary transition-colors">{member.displayName}</p>
										<ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
									</div>
									<p className="text-sm text-muted-foreground truncate">
										{member.email}
									</p>
								</Link>
								{isAdmin ? (
									<Select
										value={member.role}
										onValueChange={(role) =>
											updateMemberMutation.mutate({ userId: member.userId, role })
										}
									>
										<SelectTrigger className="w-28">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="admin">Admin</SelectItem>
											<SelectItem value="member">Member</SelectItem>
											<SelectItem value="child">Child</SelectItem>
										</SelectContent>
									</Select>
								) : (
									<Badge variant="secondary" className="capitalize">
										{member.role}
									</Badge>
								)}
								{isAdmin && member.userId !== currentFamily?.id && (
									<Button
										variant="ghost"
										size="icon"
										onClick={() => removeMemberMutation.mutate(member.userId)}
										disabled={removeMemberMutation.isPending}
									>
										<Trash2 className="w-4 h-4 text-muted-foreground" />
									</Button>
								)}
							</div>
						))
					)}
				</CardContent>
			</Card>

			{/* Invites Section (Admin only) */}
			{isAdmin && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<LinkIcon className="w-5 h-5" />
									Invite Links
								</CardTitle>
								<CardDescription>
									Create links to invite new members
								</CardDescription>
							</div>
							<Button onClick={() => setIsInviteDialogOpen(true)} size="sm">
								<Plus className="w-4 h-4 mr-2" />
								New Invite
							</Button>
						</div>
					</CardHeader>
					<CardContent className="space-y-3">
						{invitesLoading ? (
							<div className="flex justify-center py-4">
								<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
							</div>
						) : invites?.length === 0 ? (
							<p className="text-center text-muted-foreground py-4">
								No invite links yet
							</p>
						) : (
							invites?.map((invite) => (
								<div
									key={invite.id}
									className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30"
								>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<code className="text-sm bg-background px-2 py-1 rounded">
												{invite.code}
											</code>
											<Badge variant="secondary" className="capitalize">
												{invite.role}
											</Badge>
										</div>
										<p className="text-xs text-muted-foreground mt-1">
											{invite.uses} use{invite.uses !== 1 ? "s" : ""}
											{invite.maxUses && ` / ${invite.maxUses} max`}
											{invite.expiresAt && ` · Expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
										</p>
									</div>
									<Button
										variant="secondary"
										size="sm"
										onClick={() => handleCopyInviteLink(invite)}
									>
										{copiedCode === invite.code ? (
											<>
												<Check className="w-4 h-4 mr-1" />
												Copied
											</>
										) : (
											<>
												<Copy className="w-4 h-4 mr-1" />
												Copy Link
											</>
										)}
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => deleteInviteMutation.mutate(invite.id)}
										disabled={deleteInviteMutation.isPending}
									>
										<Trash2 className="w-4 h-4 text-muted-foreground" />
									</Button>
								</div>
							))
						)}
					</CardContent>
				</Card>
			)}

			{/* Create Invite Dialog */}
			<Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create Invite Link</DialogTitle>
						<DialogDescription>
							Create a link that others can use to join your family.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">Role for new member</label>
							<Select value={inviteRole} onValueChange={(v) => setInviteRole(v as typeof inviteRole)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="member">Member</SelectItem>
									<SelectItem value="child">Child</SelectItem>
									<SelectItem value="admin">Admin</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={() => createInviteMutation.mutate(inviteRole)}
							disabled={createInviteMutation.isPending}
						>
							{createInviteMutation.isPending && (
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							)}
							Create
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
