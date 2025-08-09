import { ComercialManager } from '@/components/admin/ComercialManager';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/AppSidebar";

const ComercialManagerPage = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-12 flex items-center border-b px-4">
            <SidebarTrigger />
            <h1 className="ml-4 font-semibold">Gestión de Comerciales</h1>
          </header>
          <main className="flex-1 overflow-y-auto">
            <ComercialManager />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ComercialManagerPage;