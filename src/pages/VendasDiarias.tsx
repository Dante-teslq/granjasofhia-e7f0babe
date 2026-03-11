import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ShoppingCart, Plus, Lock, Trash2, DollarSign, TrendingUp, Package, AlertCircle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/contexts/AppContext";
import { useVendasDiarias } from "@/hooks/useVendasDiarias";
import { usePontosDeVenda } from "@/hooks/usePontosDeVenda";
import { useEstoquePdv } from "@/hooks/useEstoquePdv";
import { PRODUCT_CATALOG } from "@/types/inventory";
import { toast } from "@/components/ui/sonner";
import GlobalDateFilter from "@/components/GlobalDateFilter";

const FORMAS_PAGAMENTO = ["Dinheiro", "PIX", "Cartão Crédito", "Cartão Débito", "Boleto", "Outros"];

const VendasDiariasPage = () => {
  const { dateRange, profile, currentRole } = useApp();
  const { pdvsVenda } = usePontosDeVenda();
  const {
    records, loading, totalHoje, totalPeriodo, qtdHoje, qtdPeriodo,
    porProduto, diaFechado, addVenda, deleteVenda, fecharDia,
  } = useVendasDiarias({ from: dateRange.from, to: dateRange.to });

  const [showAdd, setShowAdd] = useState(false);
  const [filterProduto, setFilterProduto] = useState("all");
  const [filterPdv, setFilterPdv] = useState("all");

  // For vendedor, filter to their PDV
  const userPdvId = profile?.pdv_id;

  // Available PDVs for this user
  const availablePdvs = currentRole === "Vendedor" && userPdvId
    ? pdvsVenda.filter(p => p.id === userPdvId)
    : pdvsVenda;

  const defaultPdvName = availablePdvs.length > 0 ? availablePdvs[0].nome : "";

  // Form state
  const [formProduto, setFormProduto] = useState("");
  const [formCodigo, setFormCodigo] = useState("");
  const [formPdv, setFormPdv] = useState(defaultPdvName);
  const [formQtd, setFormQtd] = useState("");
  const [formValor, setFormValor] = useState("");
  const [formPagamento, setFormPagamento] = useState("Dinheiro");
  const [formObs, setFormObs] = useState("");

  // Get stock for selected PDV
  const selectedPdvObj = pdvsVenda.find(p => p.nome === formPdv);
  const { items: stockItems } = useEstoquePdv(selectedPdvObj?.id);

  const todayStr = format(dateRange.from, "yyyy-MM-dd");

  const filtered = records.filter(r => {
    if (filterProduto !== "all" && r.produto !== filterProduto) return false;
    if (filterPdv !== "all" && r.ponto_venda !== filterPdv) return false;
    // Vendedor sees only their PDV sales
    if (currentRole === "Vendedor" && userPdvId) {
      const userPdvObj = pdvsVenda.find(p => p.id === userPdvId);
      if (userPdvObj && r.ponto_venda !== userPdvObj.nome) return false;
    }
    return true;
  });

  const uniqueProducts = [...new Set(records.map(r => r.produto))];

  const handleSelectProduct = (desc: string) => {
    setFormProduto(desc);
    const cat = PRODUCT_CATALOG.find(p => p.descricao === desc);
    if (cat) setFormCodigo(cat.codigo);
  };

  const handleOpenAdd = () => {
    if (availablePdvs.length > 0) setFormPdv(availablePdvs[0].nome);
    setShowAdd(true);
  };

  const handleAdd = async () => {
    if (!formProduto || !formQtd || !formValor) {
      toast.error("Preencha produto, quantidade e valor.");
      return;
    }
    if (!formPdv) {
      toast.error("Selecione o ponto de venda.");
      return;
    }

    // Check stock availability
    const stockItem = stockItems.find(s => s.produto_codigo === formCodigo);
    const available = stockItem?.quantidade || 0;
    if (available < Number(formQtd)) {
      toast.error(`Estoque insuficiente! Disponível: ${available} unidades neste PDV.`);
      return;
    }

    try {
      await addVenda({
        data: todayStr,
        produto: formProduto,
        codigo_produto: formCodigo,
        ponto_venda: formPdv,
        quantidade: Number(formQtd),
        valor_unitario: Number(formValor),
        forma_pagamento: formPagamento,
        usuario: profile?.nome || profile?.email || "Sistema",
        observacao: formObs,
      });

      // Decrease stock in PDV
      if (selectedPdvObj && stockItem) {
        const { supabase } = await import("@/integrations/supabase/client");
        await supabase.from("estoque_pdv").update({
          quantidade: available - Number(formQtd),
        } as any).eq("id", stockItem.id);

        // Record movement
        await supabase.from("movimentacoes_estoque").insert([{
          produto_codigo: formCodigo,
          produto_descricao: formProduto,
          quantidade: Number(formQtd),
          tipo: "venda",
          pdv_origem_id: selectedPdvObj.id,
          usuario: profile?.nome || profile?.email || "Sistema",
          observacao: `Venda registrada - ${formPdv}`,
        }] as any);
      }

      toast.success("Venda registrada!");
      setShowAdd(false);
      setFormProduto(""); setFormCodigo(""); setFormQtd(""); setFormValor(""); setFormObs("");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVenda(id);
      toast.success("Venda removida.");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  const handleFecharDia = async () => {
    try {
      await fecharDia(todayStr);
      toast.success("Dia fechado com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao fechar dia: " + e.message);
    }
  };

  // Stock info for selected product
  const selectedStockItem = stockItems.find(s => s.produto_codigo === formCodigo);
  const selectedStockQtd = selectedStockItem?.quantidade || 0;

  const stats = [
    { label: "Total Hoje", value: `R$ ${totalHoje.toFixed(2)}`, icon: DollarSign },
    { label: "Qtd Hoje", value: qtdHoje.toString(), icon: ShoppingCart },
    { label: "Total Período", value: `R$ ${totalPeriodo.toFixed(2)}`, icon: TrendingUp },
    { label: "Qtd Período", value: qtdPeriodo.toString(), icon: Package },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-10 space-y-6 max-w-[1400px] animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">Vendas Diárias</h1>
            <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">
              Registro operacional de vendas — {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <GlobalDateFilter />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {stats.map(stat => (
            <div key={stat.label} className="glass-card p-4 md:p-6">
              <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 text-primary mb-3">
                <stat.icon className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <p className="text-xl md:text-3xl font-extrabold tracking-tight text-foreground">{stat.value}</p>
              <p className="text-[10px] md:text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Select value={filterProduto} onValueChange={setFilterProduto}>
              <SelectTrigger className="w-[180px] h-10 text-sm"><SelectValue placeholder="Produto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Produtos</SelectItem>
                {uniqueProducts.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            {currentRole !== "Vendedor" && (
              <Select value={filterPdv} onValueChange={setFilterPdv}>
                <SelectTrigger className="w-[180px] h-10 text-sm"><SelectValue placeholder="PDV" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os PDVs</SelectItem>
                  {availablePdvs.map(s => <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {!diaFechado && (
              <>
                <Button onClick={handleOpenAdd} className="gap-2 flex-1 sm:flex-initial h-12 md:h-10">
                  <Plus className="w-4 h-4" /> Nova Venda
                </Button>
                {currentRole === "Admin" && (
                  <Button variant="outline" onClick={handleFecharDia} className="gap-2 flex-1 sm:flex-initial h-12 md:h-10 border-destructive/30 text-destructive hover:bg-destructive/10">
                    <Lock className="w-4 h-4" /> Fechar Dia
                  </Button>
                )}
              </>
            )}
            {diaFechado && (
              <Badge variant="outline" className="border-primary/40 text-primary py-2 px-4 text-sm">
                <Lock className="w-3 h-3 mr-1" /> Dia Fechado
              </Badge>
            )}
          </div>
        </div>

        {porProduto.length > 0 && (
          <div className="glass-card p-4 md:p-6">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">🏆 Ranking de Produtos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {porProduto.slice(0, 6).map((p, i) => (
                <div key={p.produto} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                  <span className="text-lg font-extrabold text-primary w-8 text-center">{i + 1}º</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.produto}</p>
                    <p className="text-xs text-muted-foreground">{p.quantidade} un — R$ {p.total.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-sm text-muted-foreground">Carregando vendas...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma venda registrada no período</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>PDV</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Valor Un.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{format(new Date(r.data + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-medium text-sm">{r.produto}</TableCell>
                      <TableCell className="text-xs">{r.ponto_venda}</TableCell>
                      <TableCell className="text-right text-sm">{r.quantidade}</TableCell>
                      <TableCell className="text-right text-sm">R$ {r.valor_unitario.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold text-sm">R$ {r.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{r.forma_pagamento}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.status === "fechado" ? "secondary" : "default"} className="text-[10px]">
                          {r.status === "fechado" ? "Fechado" : "Aberto"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.status === "aberto" && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" /> Registrar Venda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ponto de Venda *</label>
              <Select value={formPdv} onValueChange={setFormPdv}>
                <SelectTrigger><SelectValue placeholder="Selecione o PDV" /></SelectTrigger>
                <SelectContent>
                  {availablePdvs.map(s => <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Produto *</label>
              <Select value={formProduto} onValueChange={handleSelectProduct}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATALOG.map(p => (
                    <SelectItem key={p.codigo} value={p.descricao}>{p.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formCodigo && selectedPdvObj && (
                <div className="flex items-center gap-2 text-xs">
                  <Package className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Estoque disponível:</span>
                  <span className={`font-bold ${selectedStockQtd <= 0 ? "text-destructive" : "text-foreground"}`}>
                    {selectedStockQtd} un.
                  </span>
                  {selectedStockQtd <= 0 && (
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertCircle className="w-3 h-3" /> Sem estoque
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Quantidade *</label>
                <Input type="number" min="1" value={formQtd} onChange={e => setFormQtd(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Valor Unitário *</label>
                <Input type="number" min="0" step="0.01" value={formValor} onChange={e => setFormValor(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Forma de Pagamento</label>
              <Select value={formPagamento} onValueChange={setFormPagamento}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMAS_PAGAMENTO.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Observação</label>
              <Textarea value={formObs} onChange={e => setFormObs(e.target.value)} placeholder="Opcional..." rows={2} />
            </div>
            {formQtd && formValor && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
                <p className="text-xs text-muted-foreground">Total da venda</p>
                <p className="text-2xl font-extrabold text-primary">R$ {(Number(formQtd) * Number(formValor)).toFixed(2)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAdd} className="gap-2"><Plus className="w-4 h-4" /> Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default VendasDiariasPage;
