import { AppSidebar } from "../crm/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function AppSidebarExample() {
  return (
    <SidebarProvider>
      <div className="flex h-[400px] w-full border rounded-lg overflow-hidden">
        <AppSidebar />
        <div className="flex-1 p-4 bg-background">
          <p className="text-muted-foreground">Основной контент</p>
        </div>
      </div>
    </SidebarProvider>
  );
}
