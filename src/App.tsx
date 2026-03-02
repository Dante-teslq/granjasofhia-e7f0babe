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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ path, children }: { path: string; children: React.ReactNode }) => {
  const { canAccess } = useApp();
  if (!canAccess(path)) return <Navigate to="/estoque" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<ProtectedRoute path="/"><Index /></ProtectedRoute>} />
    <Route path="/estoque" element={<Estoque />} />
    <Route path="/sangrias" element={<Sangrias />} />
    <Route path="/apuracao" element={<ProtectedRoute path="/apuracao"><Apuracao /></ProtectedRoute>} />
    <Route path="/auditoria" element={<ProtectedRoute path="/auditoria"><Auditoria /></ProtectedRoute>} />
    <Route path="/alertas" element={<ProtectedRoute path="/alertas"><Alertas /></ProtectedRoute>} />
    <Route path="/antifraude" element={<ProtectedRoute path="/antifraude"><Antifraude /></ProtectedRoute>} />
    <Route path="/evidencias" element={<ProtectedRoute path="/evidencias"><Evidencias /></ProtectedRoute>} />
    <Route path="/usuarios" element={<ProtectedRoute path="/usuarios"><Usuarios /></ProtectedRoute>} />
    <Route path="/configuracoes" element={<ProtectedRoute path="/configuracoes"><Configuracoes /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <InventoryProvider>
          <AuditProvider>
            <FraudProvider>
              <Toaster />
              <Sonner />
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

export default App;
