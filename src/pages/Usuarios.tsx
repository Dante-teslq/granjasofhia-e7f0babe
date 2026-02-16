import DashboardLayout from "@/components/DashboardLayout";
import { Users, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const roles = [
  { name: "Operador", desc: "Registra entradas e vendas", color: "bg-muted text-foreground" },
  { name: "Supervisor", desc: "Aprova ajustes manuais", color: "bg-primary/10 text-primary" },
  { name: "Administrador", desc: "Visualiza relatórios completos", color: "bg-primary/20 text-primary" },
  { name: "Auditor", desc: "Acesso somente leitura", color: "bg-muted text-muted-foreground" },
];

const mockUsers = [
  { name: "Maria Silva", email: "maria@granja.com", role: "Operador", status: "ativo" },
  { name: "João Santos", email: "joao@granja.com", role: "Supervisor", status: "ativo" },
  { name: "Carlos Lima", email: "carlos@granja.com", role: "Administrador", status: "ativo" },
  { name: "Ana Souza", email: "ana@granja.com", role: "Auditor", status: "ativo" },
  { name: "Pedro Costa", email: "pedro@granja.com", role: "Operador", status: "inativo" },
];

const UsuariosPage = () => {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários & Perfis</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Controle de permissões RBAC — nenhum perfil pode excluir registros
          </p>
        </div>

        {/* Roles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.map((role) => (
            <div key={role.name} className="glass-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{role.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{role.desc}</p>
            </div>
          ))}
        </div>

        {/* Users Table */}
        <div className="glass-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-foreground">
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Perfil</th>
                  <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockUsers.map((user, idx) => (
                  <tr
                    key={idx}
                    className={`border-t border-border hover:bg-muted/30 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}
                  >
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={user.status === "ativo" ? "default" : "secondary"}
                        className={user.status === "ativo" ? "bg-success text-success-foreground" : ""}
                      >
                        {user.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UsuariosPage;
