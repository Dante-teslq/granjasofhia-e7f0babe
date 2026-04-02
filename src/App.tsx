import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { InventoryProvider } from "@/contexts/InventoryContext";
import { AuditProvider } from "@/contexts/AuditContext";
import { FraudProvider } from "@/contexts/FraudContext";
import { AppProvider, useApp } from "@/contexts/AppContext";
import Index from "./pages/Index";
import Estoque from "./pages/Estoque";

import Apuracao from "./pages/Apuracao";
import Auditoria from "./pages/Auditoria";
import Alertas from "./pages/Alertas";
import Usuarios from "./pages/Usuarios";
import Configuracoes from "./pages/Configuracoes";
import Antifraude from "./pages/Antifraude";
import Evidencias from "./pages/Evidencias";
import Transferencias from "./pages/Transferencias";
import VendasDiarias from "./pages/VendasDiarias";
import Integracoes from "./pages/Integracoes";
import DashboardLayout from "./components/DashboardLayout";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { PwaInstallBanner } from "./components/PwaInstallBanner";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { PwaUpdateNotifier } from "./components/PwaUpdateNotifier";
import { PwaDesktopInstallBanner } from "./components/PwaDesktopInstallBanner";
import { PWAInstallBanner } from "./components/PwaUnifiedInstallBanner";

const queryClient = new QueryClient();


const ProtectedRoute = ({ path, children }: { path: string; children: React.ReactNode }) => {
  const { canAccess, currentRole } = useApp();
  if (!canAccess(path)) {
    // Redirect based on role
    const fallback = (currentRole === "Operador de Venda" || currentRole === "Operador de Depósito") ? "/estoque" : "/";
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
};

const AuthenticatedLayout = () => {
  const { session, loading, profile } = useApp();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary text-sm">Carregando...</div>
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  if (session && !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary text-sm">Carregando perfil...</div>
      </div>
    );
  }
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};

/** After login, redirect to the correct home based on role */
const RoleBasedHome = () => {
  const { currentRole } = useApp();
  if (currentRole === "Operador de Venda") {
    return <Navigate to="/vendas-diarias" replace />;
  }
  if (currentRole === "Operador de Depósito") {
    return <Navigate to="/estoque" replace />;
  }
  // Administrador, Supervisor, Auditor → Dashboard
  return <Index />;
};

const AppRoutes = () => {
  const { session, loading } = useApp();

  return (
    <Routes>
      <Route path="/login" element={
        loading ? null : session ? <Navigate to="/" replace /> : <Login />
      } />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<AuthenticatedLayout />}>
        <Route path="/" element={<ProtectedRoute path="/"><RoleBasedHome /></ProtectedRoute>} />
        <Route path="/estoque" element={<ProtectedRoute path="/estoque"><Estoque /></ProtectedRoute>} />
        <Route path="/sangrias" element={<Navigate to="/transferencias" replace />} />
        <Route path="/apuracao" element={<ProtectedRoute path="/apuracao"><Apuracao /></ProtectedRoute>} />
        <Route path="/auditoria" element={<ProtectedRoute path="/auditoria"><Auditoria /></ProtectedRoute>} />
        <Route path="/alertas" element={<ProtectedRoute path="/alertas"><Alertas /></ProtectedRoute>} />
        <Route path="/antifraude" element={<ProtectedRoute path="/antifraude"><Antifraude /></ProtectedRoute>} />
        <Route path="/vendas-diarias" element={<ProtectedRoute path="/vendas-diarias"><VendasDiarias /></ProtectedRoute>} />
        <Route path="/evidencias" element={<ProtectedRoute path="/evidencias"><Evidencias /></ProtectedRoute>} />
        <Route path="/transferencias" element={<ProtectedRoute path="/transferencias"><Transferencias /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute path="/usuarios"><Usuarios /></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute path="/configuracoes"><Configuracoes /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <InventoryProvider>
          <AuditProvider>
            <FraudProvider>
              <Toaster />
              <Sonner />
              <OfflineIndicator />
              <PwaInstallBanner />
              <PwaDesktopInstallBanner />
              <PwaUpdateNotifier />
              <PWAInstallBanner />
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </FraudProvider>
          </AuditProvider>
        </InventoryProvider>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
