import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { InventoryProvider } from "@/contexts/InventoryContext";
import { AuditProvider } from "@/contexts/AuditContext";
import { FraudProvider } from "@/contexts/FraudContext";
import { AppProvider, useApp } from "@/contexts/AppContext";
import Index from "./pages/Index";
import Estoque from "./pages/Estoque";
import Sangrias from "./pages/Sangrias";
import Apuracao from "./pages/Apuracao";
import Auditoria from "./pages/Auditoria";
import Alertas from "./pages/Alertas";
import Usuarios from "./pages/Usuarios";
import Configuracoes from "./pages/Configuracoes";
import Antifraude from "./pages/Antifraude";
import Evidencias from "./pages/Evidencias";
import VendasDiarias from "./pages/VendasDiarias";
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
    const fallback = currentRole === "Administrador" ? "/" : "/estoque";
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
};

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { session, loading, profile } = useApp();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary text-sm">Carregando...</div>
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  // Wait for profile to load before rendering children (prevents wrong role redirect)
  if (session && !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary text-sm">Carregando perfil...</div>
      </div>
    );
  }
  return <>{children}</>;
};

/** After login, redirect to the correct home based on role */
const RoleBasedHome = () => {
  const { currentRole } = useApp();
  if (currentRole === "Operador") {
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
      <Route path="/" element={<AuthGuard><ProtectedRoute path="/"><RoleBasedHome /></ProtectedRoute></AuthGuard>} />
      <Route path="/estoque" element={<AuthGuard><Estoque /></AuthGuard>} />
      <Route path="/sangrias" element={<AuthGuard><Sangrias /></AuthGuard>} />
      <Route path="/apuracao" element={<AuthGuard><ProtectedRoute path="/apuracao"><Apuracao /></ProtectedRoute></AuthGuard>} />
      <Route path="/auditoria" element={<AuthGuard><ProtectedRoute path="/auditoria"><Auditoria /></ProtectedRoute></AuthGuard>} />
      <Route path="/alertas" element={<AuthGuard><ProtectedRoute path="/alertas"><Alertas /></ProtectedRoute></AuthGuard>} />
      <Route path="/antifraude" element={<AuthGuard><ProtectedRoute path="/antifraude"><Antifraude /></ProtectedRoute></AuthGuard>} />
      <Route path="/vendas-diarias" element={<AuthGuard><ProtectedRoute path="/vendas-diarias"><VendasDiarias /></ProtectedRoute></AuthGuard>} />
      <Route path="/evidencias" element={<AuthGuard><ProtectedRoute path="/evidencias"><Evidencias /></ProtectedRoute></AuthGuard>} />
      <Route path="/usuarios" element={<AuthGuard><ProtectedRoute path="/usuarios"><Usuarios /></ProtectedRoute></AuthGuard>} />
      <Route path="/configuracoes" element={<AuthGuard><ProtectedRoute path="/configuracoes"><Configuracoes /></ProtectedRoute></AuthGuard>} />
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
