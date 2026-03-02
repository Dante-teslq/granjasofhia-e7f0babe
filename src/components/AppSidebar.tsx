import { Package, LayoutDashboard, ClipboardList, Settings, Shield, Bell, FileText, Users, ShieldAlert, Camera } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const allLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", section: "Operacional" },
  { to: "/estoque", icon: Package, label: "Estoque Diário", section: "Operacional" },
  { to: "/apuracao", icon: FileText, label: "Apuração de Vendas", section: "Operacional" },
  { to: "/sangrias", icon: ClipboardList, label: "Sangrias & Insumos", section: "Operacional" },
  { to: "/evidencias", icon: Camera, label: "Evidências de Perdas", section: "Operacional" },
  { to: "/auditoria", icon: FileText, label: "Log de Auditoria", section: "Segurança" },
  { to: "/alertas", icon: Bell, label: "Alertas", section: "Segurança" },
  { to: "/antifraude", icon: ShieldAlert, label: "Painel de Segurança", section: "Segurança" },
  { to: "/usuarios", icon: Users, label: "Usuários & Perfis", section: "Segurança" },
  { to: "/configuracoes", icon: Settings, label: "Configurações", section: "Sistema" },
];

const AppSidebar = () => {
  const { currentRole, setCurrentRole, canAccess } = useApp();

  const filteredLinks = allLinks.filter((link) => canAccess(link.to));
  const sections = [...new Set(filteredLinks.map((l) => l.section))];

  return (
    <aside className="w-64 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border shrink-0">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-primary-foreground" />
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

      <nav className="flex-1 p-4 space-y-6">
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
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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

      {/* Role switcher for demo */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-wide">Perfil ativo</p>
        <Select value={currentRole} onValueChange={(v) => setCurrentRole(v as any)}>
          <SelectTrigger className="h-8 text-xs bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Operador">Operador</SelectItem>
            <SelectItem value="Supervisor">Supervisor</SelectItem>
            <SelectItem value="Administrador">Administrador</SelectItem>
            <SelectItem value="Auditor">Auditor</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[10px] text-sidebar-foreground/30 text-center tracking-wide">
          © 2026 Granja Sofhia
        </p>
      </div>
    </aside>
  );
};

export default AppSidebar;
