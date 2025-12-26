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
import { ThemeProvider } from "./components/theme-provider";

import { Toaster } from "@/components/ui/sonner";
import { useMediaQuery } from "@/hooks/use-media-query";

export function App() {
	const isDesktop = useMediaQuery("(min-width: 768px)");

	return (
		<ThemeProvider>
			<Routes>
				<Route path="/login" element={<LoginPage />} />
				<Route element={<ProtectedRoute />}>
					<Route path="/family" element={<FamilySelectPage />} />
					<Route element={<AppLayout />}>
						<Route index element={<HomePage />} />
						<Route path="recipes" element={<RecipesPage />} />
						<Route path="recipes/new" element={<RecipeEditPage isNew />} />
						<Route path="recipes/:recipeId" element={<RecipeDetailPage />} />
						<Route path="recipes/:recipeId/edit" element={<RecipeEditPage />} />
						<Route path="shopping" element={<ShoppingPage />} />
						<Route path="tasks" element={<TasksPage />} />
						<Route path="calendar" element={<CalendarPage />} />
						<Route path="settings" element={<SettingsPage />} />
						<Route path="settings/family" element={<FamilyManagePage />} />
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
