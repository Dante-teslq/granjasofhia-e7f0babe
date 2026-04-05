import { useState, useEffect } from "react";
import { MapPin, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

const tipoLabels: Record<string, string> = {
  loja: "Loja",
  rota: "Rota",
  deposito: "Depósito",
  granja: "Granja",
};

const tipoColors: Record<string, string> = {
  loja: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  rota: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  deposito: "bg-purple-500/10 text-purple-700 border-purple-500/30",
  granja: "bg-green-500/10 text-green-700 border-green-500/30",
};

interface PontoDeVenda {
  id: string;
  nome: string;
  tipo: string;
  permite_venda: boolean;
  status: string;
  created_at: string;
}

const emptyForm = {
  nome: "",
  tipo: "loja",
  permite_venda: true,
  status: "ativo",
};

export default function PontosDeVendaPage() {
  const [pdvs, setPdvs] = useState<PontoDeVenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPdvs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pontos_de_venda")
      .select("*")
      .order("nome");
    if (error) {
      toast.error("Erro ao carregar pontos de venda.");
    } else {
      setPdvs((data as PontoDeVenda[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPdvs(); }, []);

  const openNew = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (pdv: PontoDeVenda) => {
    setEditId(pdv.id);
    setForm({
      nome: pdv.nome,
      tipo: pdv.tipo,
      permite_venda: pdv.permite_venda,
      status: pdv.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do ponto de venda.");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        const { error } = await supabase
          .from("pontos_de_venda")
          .update({ nome: form.nome.trim(), tipo: form.tipo, permite_venda: form.permite_venda, status: form.status })
          .eq("id", editId);
        if (error) throw error;
        toast.success("Ponto de venda atualizado.");
      } else {
        const { error } = await supabase
          .from("pontos_de_venda")
          .insert({ nome: form.nome.trim(), tipo: form.tipo, permite_venda: form.permite_venda, status: form.status });
        if (error) throw error;
        toast.success("Ponto de venda criado.");
      }
      setDialogOpen(false);
      fetchPdvs();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (pdv: PontoDeVenda) => {
    const novoStatus = pdv.status === "ativo" ? "inativo" : "ativo";
    const { error } = await supabase
      .from("pontos_de_venda")
      .update({ status: novoStatus })
      .eq("id", pdv.id);
    if (error) {
      toast.error("Erro ao alterar status.");
    } else {
      toast.success(`PDV ${novoStatus === "ativo" ? "ativado" : "desativado"}.`);
      fetchPdvs();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from("pontos_de_venda")
      .delete()
      .eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir. Verifique se o PDV não está vinculado a dados.");
    } else {
      toast.success("Ponto de venda excluído.");
      fetchPdvs();
    }
    setDeleteId(null);
  };

  const pdvToDelete = pdvs.find((p) => p.id === deleteId);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Pontos de Venda</h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Gerencie os PDVs cadastrados no sistema
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> Novo PDV
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : pdvs.length === 0 ? (
          <div className="p-8 text-center">
            <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum ponto de venda cadastrado.</p>
            <Button onClick={openNew} variant="outline" className="mt-4 gap-2">
              <Plus className="w-4 h-4" /> Cadastrar primeiro PDV
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Permite Venda</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pdvs.map((pdv) => (
                  <tr key={pdv.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{pdv.nome}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={tipoColors[pdv.tipo] || ""}>
                        {tipoLabels[pdv.tipo] || pdv.tipo}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={pdv.permite_venda
                        ? "bg-green-500/10 text-green-700 border-green-500/30"
                        : "bg-muted text-muted-foreground"}>
                        {pdv.permite_venda ? "Sim" : "Não"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(pdv)}
                        className="flex items-center gap-1.5 text-xs font-medium"
                        title="Clique para alternar status"
                      >
                        {pdv.status === "ativo" ? (
                          <>
                            <ToggleRight className="w-4 h-4 text-green-600" />
                            <span className="text-green-700">Ativo</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Inativo</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(pdv)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(pdv.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog: criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Ponto de Venda" : "Novo Ponto de Venda"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Filial Granja Sofhia"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loja">Loja</SelectItem>
                  <SelectItem value="rota">Rota</SelectItem>
                  <SelectItem value="deposito">Depósito</SelectItem>
                  <SelectItem value="granja">Granja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Permite Venda</Label>
              <Switch
                checked={form.permite_venda}
                onCheckedChange={(v) => setForm((f) => ({ ...f, permite_venda: v }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: confirmar exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ponto de venda?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{pdvToDelete?.nome}</strong> será removido permanentemente. Esta ação não pode ser desfeita.
              {" "}Se o PDV tiver dados vinculados (estoque, transferências), a exclusão será bloqueada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
