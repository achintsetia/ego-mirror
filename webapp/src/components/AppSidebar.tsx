import { Mic, Target, Brain, BarChart3, Users, Settings, Home, LogOut, Lock, ListTodo } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { title: "Home", url: "/", icon: Home, requiresConversation: false },
  { title: "Talk to Avyaa", url: "/voice", icon: Mic, requiresConversation: false },
  { title: "To-Do", url: "/todos", icon: ListTodo, requiresConversation: false },
  { title: "Habit Tracker", url: "/habits", icon: Target, requiresConversation: true },
  { title: "Personality", url: "/personality", icon: Brain, requiresConversation: true },
  { title: "Reports", url: "/reports", icon: BarChart3, requiresConversation: true },
];

const adminItems = [
  { title: "Users", url: "/admin/users", icon: Users, requiresConversation: true },
  { title: "AI Models", url: "/admin/models", icon: Settings, requiresConversation: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, logout, hasConversation, isAdmin } = useAuth();

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <svg className="h-8 w-8 shrink-0" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="em-bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7c3aed"/>
                <stop offset="100%" stopColor="#06b6d4"/>
              </linearGradient>
              <linearGradient id="em-shine" x1="0.2" y1="0" x2="0.8" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="7" fill="url(#em-bg)"/>
            <ellipse cx="16" cy="12" rx="8" ry="9.5" fill="url(#em-shine)" stroke="white" strokeWidth="1.5" strokeOpacity="0.8"/>
            <rect x="14.75" y="21" width="2.5" height="6" rx="1.25" fill="white" fillOpacity="0.7"/>
            <path d="M16 7 L16.8 11 L21 12 L16.8 13 L16 17 L15.2 13 L11 12 L15.2 11 Z" fill="white" fillOpacity="0.92"/>
          </svg>
          {!collapsed && (
            <span className="font-display font-bold text-lg text-foreground">
              Ego-Mirror
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigate</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const locked = item.requiresConversation && !hasConversation;
                return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink
                      to={item.url}
                      end
                      className={locked ? "opacity-40 pointer-events-none select-none" : "hover:bg-muted/50"}
                      activeClassName="bg-secondary text-secondary-foreground font-semibold"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="flex-1">{item.title}</span>}
                      {locked && !collapsed && <Lock className="h-3 w-3 shrink-0" />}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => {
                const locked = item.requiresConversation && !hasConversation;
                return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink
                      to={item.url}
                      end
                      className={locked ? "opacity-40 pointer-events-none select-none" : "hover:bg-muted/50"}
                      activeClassName="bg-secondary text-secondary-foreground font-semibold"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="flex-1">{item.title}</span>}
                      {locked && !collapsed && <Lock className="h-3 w-3 shrink-0" />}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || "User"} referrerPolicy="no-referrer" />}
            <AvatarFallback className="bg-lavender text-lavender-light text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-semibold truncate">{user?.displayName || "User"}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
