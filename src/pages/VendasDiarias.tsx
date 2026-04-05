import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ShoppingCart, Plus, Lock, Trash2, Package, Calendar, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/contexts/AppContext";
import { useVendasDiarias } from "@/hooks/useVendasDiarias";
import { STORES, PRODUCT_CATALOG } from "@/types/inventory";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import GlobalDateFilter from "@/components/GlobalDateFilter";

const FORMAS_PAGAMENTO = ["Dinheiro", "PIX", "Cartão Crédito", "Cartão Débito", "Boleto", "Outros"];

interface QuebrasRow { data: string; loja: string; quebrado: number; }
interface InsumosRow { data: string; ponto_venda: string; cartelas: number; barbantes: number; total: number; }

const VendasDiariasPage = () => {
  const { dateRange, profile, isOperator, userPdvName, currentRole } = useApp();
  const isAdmin = currentRole === "Administrador" || currentRole === "Admin";
  const {
    records, loading, totalHoje, totalPeriodo, qtdHoje, qtdPeriodo,
    porProduto, diaFechado, addVenda, deleteVenda, fecharDia,
  } = useVendasDiarias({ from: dateRange.from, to: dateRange.to });

  const [showAdd, setShowAdd] = useState(false);
  const [filterProduto, setFilterProduto] = useState("all");
  const [filterPdv, setFilterPdv] = useState(isOperator && userPdvName ? userPdvName : "all");

  // Form state
  const [formProduto, setFormProduto] = useState("");
  const [formCodigo, setFormCodigo] = useState("");
  const [formPdv, setFormPdv] = useState(isOperator && userPdvName ? userPdvName : STORES[0] as string);
  const [formQtd, setFormQtd] = useState("");
  const [formValor, setFormValor] = useState("");
  const [formPagamento, setFormPagamento] = useState("Dinheiro");
  const [formObs, setFormObs] = useState("");

  const todayStr = format(dateRange.from, "yyyy-MM-dd");

  const mesInicio = format(startOfMonth(dateRange.from), "yyyy-MM-dd");
  const mesFim = format(endOfMonth(dateRange.from), "yyyy-MM-dd");

  const [quebrasMensal, setQuebrasMensal] = useState(0);
  const [insumosMensal, setInsumosMensal] = useState(0);
  const [quebrasMensalData, setQuebrasMensalData] = useState<QuebrasRow[]>([]);
  const [insumosMensalData, setInsumosMensalData] = useState<InsumosRow[]>([]);

  useEffect(() => {
    const fetchMonthlyData = async () => {
      const { data: estoqueData } = await supabase
        .from("estoque_registros")
        .select("data, loja, quebrado")
        .gte("data", mesInicio)
        .lte("data", mesFim)
        .gt("quebrado", 0)
        .order("data", { ascending: false });
      if (estoqueData) {
        setQuebrasMensal(estoqueData.reduce((s, r) => s + Math.abs(Number(r.quebrado)), 0));
        setQuebrasMensalData(estoqueData.map(r => ({
          data: r.data,
          loja: r.loja,
          quebrado: Math.abs(Number(r.quebrado)),
        })));
      }

      const { data: sangriasData } = await supabase
        .from("sangrias")
        .select("data, ponto_venda, cartelas_vazias, barbantes")
        .gte("data", mesInicio)
        .lte("data", mesFim)
        .order("data", { ascending: false });
      if (sangriasData) {
        const rows: InsumosRow[] = sangriasData.map(r => {
          const cartelas = r.cartelas_vazias ? r.cartelas_vazias.split(",").filter(Boolean).length : 0;
          const barbantes = r.barbantes ? r.barbantes.split(",").filter(Boolean).length : 0;
          return { data: r.data, ponto_venda: r.ponto_venda, cartelas, barbantes, total: cartelas + barbantes };
        });
        setInsumosMensalData(rows);
        setInsumosMensal(rows.reduce((s, r) => s + r.total, 0));
      }
    };
    fetchMonthlyData();
  }, [mesInicio, mesFim]);

  const vendasMensal = useMemo(() => {
    return records.filter(r => r.data >= mesInicio && r.data <= mesFim)
      .reduce((s, r) => s + r.quantidade, 0);
  }, [records, mesInicio, mesFim]);

  // Monthly sales aggregated by product
  const vendasMensalPorProduto = useMemo(() => {
    const monthly = records.filter(r => r.data >= mesInicio && r.data <= mesFim);
    const map = new Map<string, number>();
    monthly.forEach(r => map.set(r.produto, (map.get(r.produto) || 0) + r.quantidade));
    return Array.from(map.entries())
      .map(([produto, quantidade]) => ({ produto, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [records, mesInicio, mesFim]);

  const filtered = records.filter(r => {
    if (filterProduto !== "all" && r.produto !== filterProduto) return false;
    if (filterPdv !== "all" && r.ponto_venda !== filterPdv) return false;
    if (isOperator && userPdvName && r.ponto_venda !== userPdvName) return false;
    return true;
  });

  const uniqueProducts = [...new Set(records.map(r => r.produto))];

  const handleSelectProduct = (desc: string) => {
    setFormProduto(desc);
    const cat = PRODUCT_CATALOG.find(p => p.descricao === desc);
    if (cat) setFormCodigo(cat.codigo);
  };

  const handleAdd = async () => {
    if (!formProduto || !formQtd) {
      toast.error("Preencha produto e quantidade.");
      return;
    }
    try {
      await addVenda({
        data: todayStr,
        produto: formProduto,
        codigo_produto: formCodigo,
        ponto_venda: formPdv,
        quantidade: Number(formQtd),
        valor_unitario: Number(formValor) || 0,
        forma_pagamento: formPagamento,
        usuario: profile?.nome || profile?.email || "Sistema",
        observacao: formObs,
      });
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

  const stats = [
    { label: "Vendas Diárias (Cartelas)", value: `${qtdHoje}`, icon: ShoppingCart },
    { label: "Vendas Mensal (Cartelas)", value: `${vendasMensal}`, icon: Calendar },
    { label: "Quebras Mensal", value: `${quebrasMensal}`, icon: AlertTriangle },
    { label: "Insumos Mensal", value: `${insumosMensal}`, icon: Package },
  ];

  return (
    <>
      <div className="p-4 md:p-6 lg:p-10 space-y-6 max-w-[1400px] animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">Vendas Diárias</h1>
            <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">
              Registro operacional de vendas — {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <GlobalDateFilter />
        </div>

        {/* Stats */}
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

        {/* Tabs */}
        <Tabs defaultValue="diario">
          <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:flex">
            <TabsTrigger value="diario">Vendas Diárias</TabsTrigger>
            <TabsTrigger value="mensal">Mensal</TabsTrigger>
            <TabsTrigger value="quebras">Quebras</TabsTrigger>
            <TabsTrigger value="insumos">Insumos</TabsTrigger>
          </TabsList>

          {/* Tab: Vendas Diárias */}
          <TabsContent value="diario" className="space-y-4 mt-4">
            {/* Filters + Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Select value={filterProduto} onValueChange={setFilterProduto}>
                  <SelectTrigger className="w-[180px] h-10 text-sm">
                    <SelectValue placeholder="Produto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Produtos</SelectItem>
                    {uniqueProducts.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                {isOperator && userPdvName ? (
                  <div className="w-[180px] h-10 text-sm flex items-center px-3 rounded-md border border-input bg-muted/50 text-muted-foreground">
                    {userPdvName}
                  </div>
                ) : (
                  <Select value={filterPdv} onValueChange={setFilterPdv}>
                    <SelectTrigger className="w-[180px] h-10 text-sm">
                      <SelectValue placeholder="PDV" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os PDVs</SelectItem>
                      {STORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                {!diaFechado && (
                  <>
                    <Button onClick={() => setShowAdd(true)} className="gap-2 flex-1 sm:flex-initial h-12 md:h-10">
                      <Plus className="w-4 h-4" /> Nova Venda
                    </Button>
                    <Button variant="outline" onClick={handleFecharDia} className="gap-2 flex-1 sm:flex-initial h-12 md:h-10 border-destructive/30 text-destructive hover:bg-destructive/10">
                      <Lock className="w-4 h-4" /> Fechar Dia
                    </Button>
                  </>
                )}
                {diaFechado && (
                  <Badge variant="outline" className="border-primary/40 text-primary py-2 px-4 text-sm">
                    <Lock className="w-3 h-3 mr-1" /> Dia Fechado
                  </Badge>
                )}
              </div>
            </div>

            {/* Ranking — admin only */}
            {isAdmin && porProduto.length > 0 && (
              <div className="glass-card p-4 md:p-6">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">🏆 Ranking de Produtos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {porProduto.slice(0, 6).map((p, i) => (
                    <div key={p.produto} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                      <span className="text-lg font-extrabold text-primary w-8 text-center">{i + 1}º</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.produto}</p>
                        <p className="text-xs text-muted-foreground">{p.quantidade} cartelas</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Table */}
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
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Total</TableHead>
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
          </TabsContent>

          {/* Tab: Vendas Mensal */}
          <TabsContent value="mensal" className="mt-4">
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Total de Vendas por Cartela — {format(dateRange.from, "MMMM/yyyy", { locale: ptBR })}
                </h3>
              </div>
              {vendasMensalPorProduto.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ShoppingCart className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">Nenhuma venda no mês</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Total (Cartelas)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendasMensalPorProduto.map((r, i) => (
                        <TableRow key={r.produto}>
                          <TableCell className="text-muted-foreground text-sm w-10">{i + 1}</TableCell>
                          <TableCell className="font-medium text-sm">{r.produto}</TableCell>
                          <TableCell className="text-right font-bold text-sm">{r.quantidade}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2">
                        <TableCell colSpan={2} className="font-bold text-sm">Total</TableCell>
                        <TableCell className="text-right font-extrabold text-sm">{vendasMensal}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab: Quebras Mensal */}
          <TabsContent value="quebras" className="mt-4">
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Total de Quebras — {format(dateRange.from, "MMMM/yyyy", { locale: ptBR })}
                </h3>
              </div>
              {quebrasMensalData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <AlertTriangle className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">Nenhuma quebra registrada no mês</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>PDV</TableHead>
                        <TableHead className="text-right">Quebras (Cartelas)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quebrasMensalData.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{format(new Date(r.data + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="text-sm">{r.loja}</TableCell>
                          <TableCell className="text-right font-bold text-sm text-destructive">{r.quebrado}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2">
                        <TableCell colSpan={2} className="font-bold text-sm">Total</TableCell>
                        <TableCell className="text-right font-extrabold text-sm text-destructive">{quebrasMensal}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab: Insumos Mensal */}
          <TabsContent value="insumos" className="mt-4">
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Total de Insumos — {format(dateRange.from, "MMMM/yyyy", { locale: ptBR })}
                </h3>
              </div>
              {insumosMensalData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">Nenhum insumo registrado no mês</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>PDV</TableHead>
                        <TableHead className="text-right">Cartelas Vazias</TableHead>
                        <TableHead className="text-right">Barbantes</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {insumosMensalData.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{format(new Date(r.data + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="text-sm">{r.ponto_venda}</TableCell>
                          <TableCell className="text-right text-sm">{r.cartelas}</TableCell>
                          <TableCell className="text-right text-sm">{r.barbantes}</TableCell>
                          <TableCell className="text-right font-bold text-sm">{r.total}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2">
                        <TableCell colSpan={4} className="font-bold text-sm">Total</TableCell>
                        <TableCell className="text-right font-extrabold text-sm">{insumosMensal}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" /> Registrar Venda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ponto de Venda *</label>
              {isOperator && userPdvName ? (
                <div className="h-10 text-sm flex items-center px-3 rounded-md border border-input bg-muted/50 text-muted-foreground">
                  {userPdvName}
                </div>
              ) : (
                <Select value={formPdv} onValueChange={setFormPdv}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Quantidade *</label>
              <Input type="number" min="1" value={formQtd} onChange={e => setFormQtd(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Observação</label>
              <Textarea value={formObs} onChange={e => setFormObs(e.target.value)} placeholder="Opcional..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAdd} className="gap-2"><Plus className="w-4 h-4" /> Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VendasDiariasPage;
