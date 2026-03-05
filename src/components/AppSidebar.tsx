import { Package, LayoutDashboard, ClipboardList, Settings, Shield, Bell, FileText, Users, ShieldAlert, Camera, LogOut, ShoppingCart } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const allLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", section: "Operacional" },
  { to: "/estoque", icon: Package, label: "Estoque Diário", section: "Operacional" },
  { to: "/apuracao", icon: FileText, label: "Apuração de Vendas", section: "Operacional" },
  { to: "/sangrias", icon: ClipboardList, label: "Sangrias & Insumos", section: "Operacional" },
  { to: "/vendas-diarias", icon: ShoppingCart, label: "Vendas Diárias", section: "Operacional" },
  { to: "/evidencias", icon: Camera, label: "Evidências de Perdas", section: "Operacional" },
  { to: "/auditoria", icon: FileText, label: "Log de Auditoria", section: "Segurança" },
  { to: "/alertas", icon: Bell, label: "Alertas", section: "Segurança" },
  { to: "/antifraude", icon: ShieldAlert, label: "Painel de Segurança", section: "Segurança" },
  { to: "/usuarios", icon: Users, label: "Usuários & Perfis", section: "Segurança" },
  { to: "/configuracoes", icon: Settings, label: "Configurações", section: "Sistema" },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

const AppSidebar = ({ onNavigate }: AppSidebarProps) => {
  const { canAccess, profile, currentRole, signOut } = useApp();

  const filteredLinks = allLinks.filter((link) => canAccess(link.to));
  const sections = [...new Set(filteredLinks.map((l) => l.section))];

  return (
    <aside className="w-full md:w-64 min-h-0 md:min-h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border shrink-0">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-sidebar-primary/40 shadow-lg">
            <img src="/logo.jpg" alt="Granja Sofhia" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-base font-bold font-serif tracking-tight text-sidebar-foreground">
              Granja Sofhia
            </h1>
            <p className="text-[10px] text-sidebar-foreground/50 tracking-wide uppercase">
              Controle Operacional
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {sections.map((section) => (
          <div key={section} className="space-y-1">
            <p className="px-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold mb-2">
              {section}
            </p>
            {filteredLinks
              .filter((l) => l.section === section)
              .map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`
                  }
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </NavLink>
              ))}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-3">
        {profile && (
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.nome || profile.email}</p>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px] shrink-0 whitespace-nowrap">
              {currentRole}
            </Badge>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { signOut(); onNavigate?.(); }}
          className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-destructive"
        >
          <LogOut className="w-4 h-4" /> Sair
        </Button>
        <p className="text-[10px] text-sidebar-foreground/30 text-center tracking-wide">
          © 2026 Granja Sofhia
        </p>
      </div>
    </aside>
  );
};

export default AppSidebar;
