import { Package, LayoutDashboard, ClipboardList, Settings, Shield, Bell, FileText, Users } from "lucide-react";
import { NavLink } from "react-router-dom";

const mainLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/estoque", icon: Package, label: "Estoque Diário" },
  { to: "/sangrias", icon: ClipboardList, label: "Sangrias & Insumos" },
];

const securityLinks = [
  { to: "/auditoria", icon: FileText, label: "Log de Auditoria" },
  { to: "/alertas", icon: Bell, label: "Alertas" },
  { to: "/usuarios", icon: Users, label: "Usuários & Perfis" },
];

const settingsLinks = [
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
];

const SidebarSection = ({ title, links }: { title: string; links: typeof mainLinks }) => (
  <div className="space-y-1">
    <p className="px-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold mb-2">
      {title}
    </p>
    {links.map((link) => (
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
);

const AppSidebar = () => {
  return (
    <aside className="w-64 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border shrink-0">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold font-serif tracking-tight text-sidebar-foreground">
              Granja Sophia
            </h1>
            <p className="text-[10px] text-sidebar-foreground/50 tracking-wide uppercase">
              Controle Operacional
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-6">
        <SidebarSection title="Operacional" links={mainLinks} />
        <SidebarSection title="Segurança" links={securityLinks} />
        <SidebarSection title="Sistema" links={settingsLinks} />
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <p className="text-[10px] text-sidebar-foreground/30 text-center tracking-wide">
          © 2026 Granja Sophia
        </p>
      </div>
    </aside>
  );
};

export default AppSidebar;
