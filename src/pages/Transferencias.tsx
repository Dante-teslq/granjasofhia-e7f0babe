import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRightLeft, Plus, Trash2, CalendarIcon } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import { STORES, PRODUCT_CATALOG } from "@/types/inventory";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import GlobalDateFilter from "@/components/GlobalDateFilter";

interface TransferenciaRecord {
  id: string;
  created_at: string;
  produto_codigo: string;
  produto_descricao: string;
  quantidade: number;
  tipo: string;
  pdv_origem_id: string | null;
  pdv_destino_id: string | null;
  usuario: string | null;
  observacao: string | null;
  origem_nome?: string;
  destino_nome?: string;
}

interface PdvOption {
  id: string;
  nome: string;
  tipo: string;
}

const TransferenciasPage = () => {
  const { profile, dateRange, isOperator, userPdvName } = useApp();

  const [records, setRecords] = useState<TransferenciaRecord[]>([]);
  const [pdvList, setPdvList] = useState<PdvOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [origemId, setOrigemId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [produtoCodigo, setProdutoCodigo] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  // Load PDVs
  useEffect(() => {
    const loadPdvs = async () => {
      const { data } = await supabase
        .from("pontos_de_venda")
        .select("id, nome, tipo")
        .eq("status", "ativo")
        .order("nome");
      if (data) setPdvList(data);
    };
    loadPdvs();
  }, []);

  // Load transfers for date range
  useEffect(() => {
    loadRecords();
  }, [dateRange]);

  const loadRecords = async () => {
    setLoading(true);
    const from = format(dateRange.from, "yyyy-MM-dd");
    const to = format(dateRange.to, "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("movimentacoes_estoque")
      .select("*")
      .eq("tipo", "transferencia")
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar transferências");
      setLoading(false);
      return;
    }

    // Map PDV ids to names
    const enriched = (data || []).map((r) => {
      const origem = pdvList.find((p) => p.id === r.pdv_origem_id);
      const destino = pdvList.find((p) => p.id === r.pdv_destino_id);
      return {
        ...r,
        origem_nome: origem?.nome || "—",
        destino_nome: destino?.nome || "—",
      };
    });

    setRecords(enriched);
    setLoading(false);
  };

  // Reload when pdvList loads
  useEffect(() => {
    if (pdvList.length > 0) loadRecords();
  }, [pdvList]);

  const depositos = pdvList.filter((p) => p.tipo === "deposito" || p.nome.toLowerCase().includes("depósito") || p.nome.toLowerCase().includes("deposito"));
  const pontosVenda = pdvList.filter((p) => !depositos.some((d) => d.id === p.id));

  // If operator, auto-set origin to their PDV
  useEffect(() => {
    if (isOperator && profile?.pdv_id) {
      setOrigemId(profile.pdv_id);
    }
  }, [isOperator, profile]);

  const selectedProduct = PRODUCT_CATALOG.find((p) => p.codigo === produtoCodigo);

  const handleSave = async () => {
    if (!origemId || !destinoId || !produtoCodigo || !quantidade) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (origemId === destinoId) {
      toast.error("Origem e destino devem ser diferentes");
      return;
    }
    const qty = Number(quantidade);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("movimentacoes_estoque").insert({
      tipo: "transferencia",
      pdv_origem_id: origemId,
      pdv_destino_id: destinoId,
      produto_codigo: produtoCodigo,
      produto_descricao: selectedProduct?.descricao || "",
      quantidade: qty,
      observacao: observacao || null,
      usuario: profile?.nome || profile?.email || null,
    });

    setSaving(false);

    if (error) {
      toast.error("Erro ao registrar transferência");
      return;
    }

    toast.success("Transferência registrada com sucesso");
    setDialogOpen(false);
    resetForm();
    loadRecords();
  };

  const resetForm = () => {
    if (!isOperator) setOrigemId("");
    setDestinoId("");
    setProdutoCodigo("");
    setQuantidade("");
    setObservacao("");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("movimentacoes_estoque").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir transferência");
      return;
    }
    toast.success("Transferência excluída");
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ArrowRightLeft className="w-6 h-6 text-primary" />
              Transferências de Estoque
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Registre transferências de produtos entre depósitos e pontos de venda
            </p>
          </div>
          <div className="flex items-center gap-2">
            <GlobalDateFilter />
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Nova Transferência
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
          <div className="glass-card p-4 md:p-6">
            <p className="text-[10px] md:text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Total no Período</p>
            <p className="text-xl md:text-3xl font-extrabold tracking-tight text-foreground">{records.length}</p>
          </div>
          <div className="glass-card p-4 md:p-6">
            <p className="text-[10px] md:text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Cartelas Transferidas</p>
            <p className="text-xl md:text-3xl font-extrabold tracking-tight text-foreground">
              {records.reduce((sum, r) => sum + r.quantidade, 0)}
            </p>
          </div>
          <div className="glass-card p-4 md:p-6">
            <p className="text-[10px] md:text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Produtos Distintos</p>
            <p className="text-xl md:text-3xl font-extrabold tracking-tight text-foreground">
              {new Set(records.map((r) => r.produto_codigo)).size}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Obs</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma transferência encontrada no período
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{r.produto_descricao}</div>
                        <div className="text-xs text-muted-foreground">Cód: {r.produto_codigo}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">{r.quantidade}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{r.origem_nome}</TableCell>
                      <TableCell className="text-sm">{r.destino_nome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.usuario || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                        {r.observacao || "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Transferência</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Origem *</label>
                <Select value={origemId} onValueChange={setOrigemId} disabled={isOperator}>
                  <SelectTrigger><SelectValue placeholder="Selecione a origem" /></SelectTrigger>
                  <SelectContent>
                    {pdvList.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Destino *</label>
                <Select value={destinoId} onValueChange={setDestinoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o destino" /></SelectTrigger>
                  <SelectContent>
                    {pdvList.filter((p) => p.id !== origemId).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Produto *</label>
                <Select value={produtoCodigo} onValueChange={setProdutoCodigo}>
                  <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATALOG.map((p) => (
                      <SelectItem key={p.codigo} value={p.codigo}>{p.descricao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Quantidade (cartelas) *</label>
                <Input
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="Ex: 10"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Observação</label>
                <Textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Observações opcionais..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Registrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default TransferenciasPage;
