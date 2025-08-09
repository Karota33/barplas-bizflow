import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/AppSidebar";

const AdminDashboardPage = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-12 flex items-center border-b px-4">
            <SidebarTrigger />
            <h1 className="ml-4 font-semibold">Panel Administrativo</h1>
          </header>
          <main className="flex-1 overflow-y-auto">
            <AdminDashboard />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboardPage;