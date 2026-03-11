import { useState } from "react";
import { MapPin, Plus, Pencil, Trash2, Store, Route, Warehouse as WarehouseIcon } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { usePontosDeVenda } from "@/hooks/usePontosDeVenda";
import { supabase } from "@/integrations/supabase/client";

const tipoIcons = { rota: Route, deposito: WarehouseIcon, loja: Store };
const tipoLabels = { rota: "Rota", deposito: "Depósito", loja: "Loja" };

const PontosDeVendaPage = () => {
  const { pdvs, loading, refetch } = usePontosDeVenda();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", tipo: "loja" as string, permite_venda: true });

  const openAdd = () => {
    setEditId(null);
    setForm({ nome: "", tipo: "loja", permite_venda: true });
    setDialogOpen(true);
  };

  const openEdit = (pdv: any) => {
    setEditId(pdv.id);
    setForm({ nome: pdv.nome, tipo: pdv.tipo, permite_venda: pdv.permite_venda });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório."); return; }
    if (editId) {
      const { error } = await supabase.from("pontos_de_venda").update(form as any).eq("id", editId);
      if (error) { toast.error("Erro: " + error.message); return; }
      toast.success("PDV atualizado!");
    } else {
      const { error } = await supabase.from("pontos_de_venda").insert([form] as any);
      if (error) { toast.error("Erro: " + error.message); return; }
      toast.success("PDV criado!");
    }
    setDialogOpen(false);
    refetch();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("pontos_de_venda").update({ status: "inativo" } as any).eq("id", deleteId);
    if (error) { toast.error("Erro: " + error.message); }
    else { toast.success("PDV desativado!"); refetch(); }
    setDeleteId(null);
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-10 space-y-6 max-w-[1400px] animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">Pontos de Venda</h1>
            <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">Gerencie rotas, depósitos e lojas</p>
          </div>
          <Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4" /> Novo PDV</Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pdvs.map(pdv => {
              const Icon = tipoIcons[pdv.tipo as keyof typeof tipoIcons] || MapPin;
              return (
                <div key={pdv.id} className="glass-card p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">{pdv.nome}</h3>
                        <Badge variant="outline" className="text-[10px] mt-0.5">
                          {tipoLabels[pdv.tipo as keyof typeof tipoLabels] || pdv.tipo}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(pdv)} className="h-8 w-8 text-primary">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(pdv.id)} className="h-8 w-8 text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Permite venda</span>
                    <Badge variant={pdv.permite_venda ? "default" : "secondary"}>
                      {pdv.permite_venda ? "Sim" : "Não"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Editar PDV" : "Novo Ponto de Venda"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium text-foreground">Nome *</label>
                <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Rota Centro" className="h-10 mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Tipo *</label>
                <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rota">Rota</SelectItem>
                    <SelectItem value="deposito">Depósito</SelectItem>
                    <SelectItem value="loja">Loja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Permite Venda</label>
                <Switch checked={form.permite_venda} onCheckedChange={v => setForm({ ...form, permite_venda: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>{editId ? "Salvar" : "Criar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteId !== null} onOpenChange={open => { if (!open) setDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desativar PDV</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza? O PDV será desativado e não aparecerá mais nas listagens.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Desativar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default PontosDeVendaPage;
