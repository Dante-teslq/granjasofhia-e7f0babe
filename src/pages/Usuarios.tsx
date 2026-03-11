import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Shield, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useApp } from "@/contexts/AppContext";
import { usePontosDeVenda } from "@/hooks/usePontosDeVenda";
import { supabase } from "@/integrations/supabase/client";

const roles = [
  { name: "Admin", desc: "Acesso completo ao sistema", color: "bg-primary/20 text-primary" },
  { name: "Vendedor", desc: "Registra vendas no PDV vinculado", color: "bg-muted text-foreground" },
  { name: "Operador Depósito", desc: "Estoque, transferências e ajustes", color: "bg-primary/10 text-primary" },
];

interface UserProfile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  status: string;
  pdv_id: string | null;
}

const UsuariosPage = () => {
  const { currentRole, refreshProfile } = useApp();
  const { pdvs } = usePontosDeVenda();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formUser, setFormUser] = useState({ nome: "", email: "", telefone: "", cargo: "Vendedor", pdv_id: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const isAdmin = currentRole === "Admin";
  const isMobile = useIsMobile();

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
    if (!error && data) setUsers(data as UserProfile[]);
    setLoadingUsers(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const openEdit = (user: UserProfile) => {
    setEditId(user.id);
    setFormUser({ nome: user.nome, email: user.email, telefone: user.telefone || "", cargo: user.cargo, pdv_id: user.pdv_id || "" });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formUser.nome || !formUser.email) { toast.error("Preencha nome e email."); return; }
    if (editId) {
      const updateData: any = {
        nome: formUser.nome,
        email: formUser.email,
        telefone: formUser.telefone,
        cargo: formUser.cargo,
        pdv_id: formUser.pdv_id || null,
      };
      const { error } = await supabase.from("profiles").update(updateData).eq("id", editId);
      if (error) { toast.error("Erro: " + error.message); return; }
      toast.success("Perfil atualizado!");
      await refreshProfile();
    }
    setDialogOpen(false);
    fetchUsers();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const userToDelete = users.find(u => u.id === deleteId);
    const { error } = await supabase.from("profiles").delete().eq("id", deleteId);
    if (error) { toast.error("Erro: " + error.message); }
    else { toast.success(`Perfil de "${userToDelete?.nome}" excluído!`); fetchUsers(); }
    setDeleteId(null);
  };

  const getPdvName = (pdvId: string | null) => {
    if (!pdvId) return "—";
    return pdvs.find(p => p.id === pdvId)?.nome || "—";
  };

  const deleteUserName = users.find(u => u.id === deleteId)?.nome || "";

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-[1400px]">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Usuários & Perfis</h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">Gerencie os perfis e vincule usuários a pontos de venda</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          {roles.map((role) => (
            <div key={role.name} className="glass-card rounded-lg p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-xs md:text-sm font-semibold text-foreground">{role.name}</span>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground">{role.desc}</p>
            </div>
          ))}
        </div>

        {loadingUsers ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Nenhum usuário.</div>
        ) : isMobile ? (
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{user.nome || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                  </div>
                  <Badge variant={user.status === "ativo" ? "default" : "secondary"} className={user.status === "ativo" ? "bg-success text-success-foreground" : ""}>
                    {user.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="border-primary/30 text-primary text-xs">{user.cargo}</Badge>
                    {user.pdv_id && <Badge variant="secondary" className="text-[10px]">{getPdvName(user.pdv_id)}</Badge>}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(user)} className="text-primary h-9"><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(user.id)} className="text-destructive h-9"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-foreground">
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Nome</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Perfil</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">PDV Vinculado</th>
                    <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider">Status</th>
                    {isAdmin && <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
                    <tr key={user.id} className={`border-t border-border hover:bg-muted/30 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="px-4 py-3 font-medium">{user.nome || "Sem nome"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="border-primary/30 text-primary text-xs">{user.cargo}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground">{getPdvName(user.pdv_id)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={user.status === "ativo" ? "default" : "secondary"} className={user.status === "ativo" ? "bg-success text-success-foreground" : ""}>
                          {user.status}
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(user)} className="text-primary"><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteId(user.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Perfil</DialogTitle>
              <DialogDescription>Atualize os dados e vincule o usuário a um ponto de venda.</DialogDescription>
            </DialogHeader>
            {editId && (
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-sm font-medium text-foreground">Nome *</label>
                  <Input value={formUser.nome} onChange={(e) => setFormUser({ ...formUser, nome: e.target.value })} className="h-10" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <Input type="email" value={formUser.email} onChange={(e) => setFormUser({ ...formUser, email: e.target.value })} className="h-10" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Telefone</label>
                  <Input value={formUser.telefone} onChange={(e) => setFormUser({ ...formUser, telefone: e.target.value })} className="h-10" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Cargo *</label>
                  <Select value={formUser.cargo} onValueChange={(v) => setFormUser({ ...formUser, cargo: v })}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Vendedor">Vendedor</SelectItem>
                      <SelectItem value="Operador Depósito">Operador Depósito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">PDV Vinculado</label>
                  <p className="text-[10px] text-muted-foreground mb-1">Vendedores só terão acesso ao PDV vinculado</p>
                  <Select value={formUser.pdv_id} onValueChange={(v) => setFormUser({ ...formUser, pdv_id: v })}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Nenhum (acesso livre)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {pdvs.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} ({p.tipo})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              {editId && <Button onClick={handleSubmit}>Salvar</Button>}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Perfil</AlertDialogTitle>
              <AlertDialogDescription>Excluir o perfil de "{deleteUserName}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default UsuariosPage;
