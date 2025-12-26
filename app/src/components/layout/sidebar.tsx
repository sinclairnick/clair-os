import { NavLink } from "react-router";
import {
  Home,
  CookingPot,
  ShoppingCart,
  CheckSquare,
  Calendar,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/recipes", label: "Recipes", icon: CookingPot },
  { to: "/shopping", label: "Shopping", icon: ShoppingCart },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/calendar", label: "Calendar", icon: Calendar },
];

export function Sidebar() {
  const { user, families, currentFamily, setCurrentFamilyId, signOut } = useAuth();

  return (
    <div className="flex flex-col h-full">
      {/* Logo & Family Selector */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xl font-semibold text-sidebar-foreground">
            ClairOS
          </span>
        </div>
        
        {families.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between text-sm"
                size="sm"
              >
                <span className="truncate">{currentFamily?.name || 'Select Family'}</span>
                <ChevronDown className="w-4 h-4 ml-2 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {families.map((family) => (
                <DropdownMenuItem
                  key={family.id}
                  onClick={() => setCurrentFamilyId(family.id)}
                  className={cn(
                    currentFamily?.id === family.id && "bg-accent"
                  )}
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: family.color }}
                  />
                  {family.name}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {family.role}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section: Settings & User */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )
          }
        >
          <Settings className="w-5 h-5" />
          Settings
        </NavLink>

        {user && (
          <div className="flex items-center gap-3 px-3 py-2">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="shrink-0"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
