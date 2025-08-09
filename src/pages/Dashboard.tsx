import { BusinessDashboard } from "@/components/dashboard/BusinessDashboard";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/AppSidebar";

export default function Dashboard() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-12 flex items-center border-b px-4">
            <SidebarTrigger />
            <h1 className="ml-4 font-semibold">Portal BARPLAS</h1>
          </header>
          <main className="flex-1 overflow-y-auto">
            <BusinessDashboard />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}