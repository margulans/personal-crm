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
} from "@/components/ui/sidebar";
import { Users, BarChart3, Zap } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationsPanel } from "./NotificationsPanel";
import { ImportExportPanel } from "./ImportExportPanel";
import { TagManagementPanel } from "./TagManagementPanel";
import { RoleManagementPanel } from "./RoleManagementPanel";
import type { Contact } from "@shared/schema";

const menuItems = [
  {
    title: "Контакты",
    url: "/",
    icon: Users,
  },
  {
    title: "Аналитика",
    url: "/analytics",
    icon: BarChart3,
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const contactCount = contacts.length;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">Personal CRM</h1>
            <p className="text-xs text-muted-foreground">
              {contactCount > 0 ? `${contactCount} контактов` : "Управление связями"}
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
                    <button onClick={() => setLocation(item.url)}>
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

      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Тема</span>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
