import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/components/auth-provider";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";

export function AppLayout() {
	const { currentFamily, families, isLoading } = useAuth();
	const location = useLocation();

	// Redirect to family selection if no family is selected and we're not already there
	if (!isLoading && families.length === 0 && location.pathname !== '/family') {
		return <Navigate to="/family" replace />;
	}

	// If user has families but none selected, redirect to select one
	if (!isLoading && families.length > 0 && !currentFamily && location.pathname !== '/family') {
		return <Navigate to="/family" replace />;
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="flex h-screen">
				{/* Desktop Sidebar */}
				<aside className="hidden md:flex md:w-64 md:flex-shrink-0">
					<div className="flex flex-col w-full bg-sidebar border-r border-sidebar-border">
						<Sidebar />
					</div>
				</aside>

				{/* Main content */}
				<main className="flex-1 overflow-y-auto pb-16 md:pb-0">
					<div className="container mx-auto p-6">
						<Outlet />
					</div>
				</main>
			</div>

			{/* Mobile bottom nav */}
			<MobileNav />
		</div>
	);
}
