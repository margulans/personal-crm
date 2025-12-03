import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/crm/AppSidebar";
import ContactsPage from "@/pages/ContactsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import NetworkGraphPage from "@/pages/NetworkGraphPage";
import LandingPage from "@/pages/LandingPage";
import TeamPage from "@/pages/TeamPage";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/useAuth";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={ContactsPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/network" component={NetworkGraphPage} />
      <Route path="/team" component={TeamPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const [location] = useLocation();
  const hideHeader = location === "/network";
  
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          {!hideHeader && (
            <header className="flex items-center h-12 px-4 border-b bg-background lg:hidden">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
            </header>
          )}
          <main className="flex-1 overflow-hidden">
            <AuthenticatedRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
