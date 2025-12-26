import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CookingPot, ShoppingCart, CheckSquare, Calendar } from "lucide-react";
import { Link } from "react-router";

const quickLinks = [
  {
    to: "/recipes",
    label: "Recipes",
    description: "Browse and manage your family recipes",
    icon: CookingPot,
    color: "text-orange-600 dark:text-orange-400",
  },
  {
    to: "/shopping",
    label: "Shopping",
    description: "Create and manage shopping lists",
    icon: ShoppingCart,
    color: "text-green-600 dark:text-green-400",
  },
  {
    to: "/tasks",
    label: "Tasks",
    description: "Track chores and to-dos",
    icon: CheckSquare,
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    to: "/calendar",
    label: "Calendar",
    description: "View your family schedule",
    icon: Calendar,
    color: "text-amber-600 dark:text-amber-400",
  },
];

export function HomePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome to ClairOS</h1>
        <p className="text-muted-foreground mt-2">
          Your family's home operations center
        </p>
      </div>

      {/* Quick Links Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {quickLinks.map((item) => (
          <Link key={item.to} to={item.to}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {item.label}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Placeholder for upcoming items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Coming Up</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Your upcoming meals, tasks, and events will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
