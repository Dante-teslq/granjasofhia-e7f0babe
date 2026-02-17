import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Users, Shield, Plus, UserPlus, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";

const roles = [
  { name: "Operador", desc: "Registra entradas e vendas", color: "bg-muted text-foreground" },
  { name: "Supervisor", desc: "Aprova ajustes manuais", color: "bg-primary/10 text-primary" },
  { name: "Administrador", desc: "Visualiza relatórios completos", color: "bg-primary/20 text-primary" },
  { name: "Auditor", desc: "Acesso somente leitura", color: "bg-muted text-muted-foreground" },
];

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
}

const initialUsers: UserProfile[] = [
  { name: "Maria Silva", email: "maria@granja.com", phone: "(11) 99999-0001", role: "Operador", status: "ativo" },
  { name: "João Santos", email: "joao@granja.com", phone: "(11) 99999-0002", role: "Supervisor", status: "ativo" },
  { name: "Carlos Lima", email: "carlos@granja.com", phone: "(11) 99999-0003", role: "Administrador", status: "ativo" },
  { name: "Ana Souza", email: "ana@granja.com", phone: "(11) 99999-0004", role: "Auditor", status: "ativo" },
  { name: "Pedro Costa", email: "pedro@granja.com", phone: "(11) 99999-0005", role: "Operador", status: "inativo" },
];

const CURRENT_USER_ROLE = "Administrador";

const UsuariosPage = () => {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [formUser, setFormUser] = useState({ name: "", email: "", phone: "", role: "Operador" });
  const isAdmin = CURRENT_USER_ROLE === "Administrador";

  const openAdd = () => {
    setEditIndex(null);
    setFormUser({ name: "", email: "", phone: "", role: "Operador" });
    setDialogOpen(true);
  };

  const openEdit = (idx: number) => {
    setEditIndex(idx);
    const u = users[idx];
    setFormUser({ name: u.name, email: u.email, phone: u.phone, role: u.role });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formUser.name || (!formUser.email && !formUser.phone)) {
      toast.error("Preencha o nome e pelo menos email ou telefone.");
      return;
    }
    if (editIndex !== null) {
      const updated = [...users];
      updated[editIndex] = { ...updated[editIndex], ...formUser };
      setUsers(updated);
      toast.success("Perfil atualizado com sucesso!");
    } else {
      setUsers([...users, { ...formUser, status: "ativo" }]);
      toast.success("Perfil adicionado com sucesso!");
    }
    setDialogOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usuários & Perfis</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Controle de permissões RBAC — nenhum perfil pode excluir registros
            </p>
          </div>
          {isAdmin && (
            <Button onClick={openAdd} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Adicionar Perfil
            </Button>
          )}
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
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Telefone</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Perfil</th>
                  <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider">Status</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr key={idx} className={`border-t border-border hover:bg-muted/30 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}>
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="border-primary/30 text-primary text-xs">{user.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={user.status === "ativo" ? "default" : "secondary"}
                        className={user.status === "ativo" ? "bg-success text-success-foreground" : ""}
                      >
                        {user.status}
                      </Badge>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-center">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(idx)} className="gap-1.5 text-primary hover:text-primary">
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Profile Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editIndex !== null ? "Editar Perfil" : "Adicionar Novo Perfil"}</DialogTitle>
              <DialogDescription>
                {editIndex !== null
                  ? "Atualize os dados do usuário. Apenas administradores podem fazer isso."
                  : "Preencha os dados do novo usuário. Apenas administradores podem fazer isso."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium text-foreground">Nome *</label>
                <Input value={formUser.name} onChange={(e) => setFormUser({ ...formUser, name: e.target.value })} placeholder="Nome completo" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input type="email" value={formUser.email} onChange={(e) => setFormUser({ ...formUser, email: e.target.value })} placeholder="email@granja.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Telefone</label>
                <Input value={formUser.phone} onChange={(e) => setFormUser({ ...formUser, phone: e.target.value })} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Cargo *</label>
                <Select value={formUser.role} onValueChange={(v) => setFormUser({ ...formUser, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operador">Operador</SelectItem>
                    <SelectItem value="Supervisor">Supervisor</SelectItem>
                    <SelectItem value="Administrador">Administrador</SelectItem>
                    <SelectItem value="Auditor">Auditor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>{editIndex !== null ? "Salvar Alterações" : "Adicionar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default UsuariosPage;
