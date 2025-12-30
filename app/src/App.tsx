import { Routes, Route } from "react-router";
import { AppLayout } from "@/components/layout/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { HomePage } from "@/routes/home";
import { RecipesPage } from "@/routes/recipes";
import { RecipeDetailPage } from "@/routes/recipe-detail";
import { RecipeEditPage } from "@/routes/recipe-edit";
import { ShoppingPage } from "@/routes/shopping";
import { TasksPage } from "@/routes/tasks";
import { CalendarPage } from "@/routes/calendar";
import { SettingsPage } from "@/routes/settings";
import { LoginPage } from "@/routes/login";
import { FamilySelectPage } from "@/routes/family-select";
import { FamilyManagePage } from "@/routes/family-manage";
import { UserProfilePage } from "@/routes/user-profile";
import { ThemeProvider } from "./components/theme-provider";
import { ROUTES, ROUTE_PATTERNS } from "@/lib/routes";

import { Toaster } from "@/components/ui/sonner";
import { useMediaQuery } from "@/hooks/use-media-query";

export function App() {
	const isDesktop = useMediaQuery("(min-width: 768px)");

	return (
		<ThemeProvider>
			<Routes>
				<Route path={ROUTES.LOGIN} element={<LoginPage />} />
				<Route element={<ProtectedRoute />}>
					<Route path={ROUTES.FAMILY_SELECT} element={<FamilySelectPage />} />
					<Route element={<AppLayout />}>
						<Route index element={<HomePage />} />
						<Route path={ROUTES.RECIPES} element={<RecipesPage />} />
						<Route path={ROUTES.RECIPE_NEW} element={<RecipeEditPage isNew />} />
						<Route path={ROUTE_PATTERNS.RECIPE_DETAIL} element={<RecipeDetailPage />} />
						<Route path={ROUTE_PATTERNS.RECIPE_EDIT} element={<RecipeEditPage />} />
						<Route path={ROUTES.SHOPPING} element={<ShoppingPage />} />
						<Route path={ROUTES.TASKS} element={<TasksPage />} />
						<Route path={ROUTES.CALENDAR} element={<CalendarPage />} />
						<Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
						<Route path={ROUTES.FAMILY_SETTINGS} element={<FamilyManagePage />} />
						<Route path={ROUTE_PATTERNS.MEMBER_PROFILE} element={<UserProfilePage />} />
					</Route>
				</Route>
			</Routes>
			<Toaster
				position={isDesktop ? "bottom-center" : "top-center"}
				toastOptions={{
					className: "rounded-3xl",
				}}
			/>
		</ThemeProvider>
	);
}

export default App;
