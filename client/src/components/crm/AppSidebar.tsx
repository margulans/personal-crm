import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, BarChart3, Zap, UserCog, LogOut, Link2 } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationsPanel } from "./NotificationsPanel";
import { ImportExportPanel } from "./ImportExportPanel";
import { TagManagementPanel } from "./TagManagementPanel";
import { RoleManagementPanel } from "./RoleManagementPanel";
import type { Contact, User, Team } from "@shared/schema";

interface AuthUser extends User {
  teams: (Team & { role: string })[];
}

const menuItems = [
  {
    title: "Контакты",
    url: "/",
    icon: Users,
  },
  {
    title: "Граф связей",
    url: "/network",
    icon: Link2,
  },
  {
    title: "Аналитика",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Команда",
    url: "/team",
    icon: UserCog,
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();
  
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    refetchInterval: 10000,
  });

  const { data: user } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
  });

  const contactCount = contacts.length;
  const teamName = user?.teams?.[0]?.name;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 via-primary to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight bg-gradient-to-r from-violet-600 via-primary to-indigo-600 bg-clip-text text-transparent">PRIMA</h1>
            <p className="text-xs text-muted-foreground">
              {contactCount > 0 ? `${contactCount} контактов` : "CRM для связей"}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                  >
                    <button onClick={() => {
                      setLocation(item.url);
                      if (isMobile) {
                        setOpenMobile(false);
                      }
                    }}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {item.title === "Контакты" && contactCount > 0 && (
                        <span 
                          className="ml-auto text-xs text-muted-foreground tabular-nums"
                          data-testid="text-contact-count"
                        >
                          {contactCount}
                        </span>
                      )}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <NotificationsPanel />
            <ImportExportPanel />
            <TagManagementPanel />
            <RoleManagementPanel />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t space-y-3">
        {user && (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback>
                {(user.firstName?.[0] || "") + (user.lastName?.[0] || "")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" data-testid="text-user-name">
                {user.firstName} {user.lastName}
              </p>
              {teamName && (
                <p className="text-xs text-muted-foreground truncate" data-testid="text-team-name">
                  {teamName}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              asChild
              data-testid="button-logout"
            >
              <a href="/api/logout">
                <LogOut className="h-4 w-4" />
              </a>
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Тема</span>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
