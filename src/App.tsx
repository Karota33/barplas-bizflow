import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import ClientPage from "./pages/ClientPage";
import CatalogPage from "./pages/CatalogPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import ComercialManagerPage from "./pages/admin/ComercialManagerPage";
import ProductManagerPage from "./pages/admin/ProductManagerPage";
import EnhancedClientsPage from "./pages/EnhancedClientsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/client/:clientId" element={<ClientPage />} />
          <Route path="/catalog/:clientId" element={<CatalogPage />} />
          <Route path="/clientes" element={<EnhancedClientsPage />} />
          
          {/* Rutas administrativas */}
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/comerciales" element={<ComercialManagerPage />} />
          <Route path="/admin/productos" element={<ProductManagerPage />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
