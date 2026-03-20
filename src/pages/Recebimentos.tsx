import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PackageCheck, Camera, CheckCircle, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import GlobalDateFilter from "@/components/GlobalDateFilter";

interface Movimentacao {
  id: string;
  created_at: string;
  produto_codigo: string;
  produto_descricao: string;
  quantidade: number;
  pdv_origem_id: string | null;
  pdv_destino_id: string | null;
  usuario: string | null;
  observacao: string | null;
  status: string;
  quantidade_recebida: number | null;
  divergencia: number | null;
  observacao_recebimento: string | null;
  foto_recebimento: string | null;
  confirmado_por: string | null;
  confirmado_em: string | null;
  origem_nome?: string;
  destino_nome?: string;
  confirmado_por_nome?: string;
}

interface PdvOption {
  id: string;
  nome: string;
}

const RecebimentosPage = () => {
  const { profile, dateRange, isOperator, userPdvName, currentRole } = useApp();
  const isAdmin = currentRole === "Admin" || currentRole === "Administrador" || currentRole === "Supervisor";

  const [pendentes, setPendentes] = useState<Movimentacao[]>([]);
  const [historico, setHistorico] = useState<Movimentacao[]>([]);
  const [pdvList, setPdvList] = useState<PdvOption[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Confirmation modal
  const [selected, setSelected] = useState<Movimentacao | null>(null);
  const [qtdRecebida, setQtdRecebida] = useState("");
  const [obsRecebimento, setObsRecebimento] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [pdvRes, profRes] = await Promise.all([
        supabase.from("pontos_de_venda").select("id, nome").eq("status", "ativo").order("nome"),
        supabase.from("profiles").select("id, nome"),
      ]);
      if (pdvRes.data) setPdvList(pdvRes.data);
      if (profRes.data) setProfiles(profRes.data);
    };
    load();
  }, []);

  const getPdvName = useCallback((id: string | null) => {
    if (!id) return "—";
    return pdvList.find((p) => p.id === id)?.nome || "—";
  }, [pdvList]);

  const getProfileName = useCallback((id: string | null) => {
    if (!id) return "—";
    return profiles.find((p) => p.id === id)?.nome || "—";
  }, [profiles]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const from = format(dateRange.from, "yyyy-MM-dd");
    const to = format(dateRange.to, "yyyy-MM-dd");

    // Pending transfers destined to user's PDV
    let pendQuery = supabase
      .from("movimentacoes_estoque")
      .select("*")
      .eq("tipo", "transferencia")
      .eq("status", "pendente")
      .order("created_at", { ascending: false });

    // History (confirmed/divergent)
    let histQuery = supabase
      .from("movimentacoes_estoque")
      .select("*")
      .eq("tipo", "transferencia")
      .in("status", ["confirmado", "divergente"])
      .gte("confirmado_em", `${from}T00:00:00`)
      .lte("confirmado_em", `${to}T23:59:59`)
      .order("confirmado_em", { ascending: false });

    const [pendRes, histRes] = await Promise.all([pendQuery, histQuery]);

    setPendentes(pendRes.data || []);
    setHistorico(histRes.data || []);
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    if (pdvList.length > 0) loadData();
  }, [pdvList, dateRange, loadData]);

  const openConfirm = (mov: Movimentacao) => {
    setSelected(mov);
    setQtdRecebida(String(mov.quantidade));
    setObsRecebimento("");
    setFotoFile(null);
  };

  const handleConfirm = async () => {
    if (!selected || !qtdRecebida) return;
    const qty = Number(qtdRecebida);
    if (isNaN(qty) || qty < 0) {
      toast.error("Quantidade inválida");
      return;
    }

    setSaving(true);

    let fotoUrl: string | null = null;

    // Upload photo if provided
    if (fotoFile) {
      const ext = fotoFile.name.split(".").pop();
      const path = `${selected.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("recebimentos")
        .upload(path, fotoFile);
      if (upErr) {
        toast.error("Erro ao enviar foto");
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("recebimentos").getPublicUrl(path);
      fotoUrl = urlData.publicUrl;
    }

    const div = qty - selected.quantidade;
    const newStatus = qty === selected.quantidade ? "confirmado" : "divergente";

    // Update the movimentacao
    const { error } = await supabase
      .from("movimentacoes_estoque")
      .update({
        status: newStatus,
        quantidade_recebida: qty,
        divergencia: div,
        observacao_recebimento: obsRecebimento || null,
        foto_recebimento: fotoUrl,
        confirmado_por: profile?.id || null,
        confirmado_em: new Date().toISOString(),
      })
      .eq("id", selected.id);

    if (error) {
      toast.error("Erro ao confirmar recebimento");
      setSaving(false);
      return;
    }

    // Update estoque_pdv: add quantidade_recebida to destination PDV stock
    if (selected.pdv_destino_id) {
      const { data: estoqueExistente } = await supabase
        .from("estoque_pdv")
        .select("id, quantidade")
        .eq("pdv_id", selected.pdv_destino_id)
        .eq("produto_codigo", selected.produto_codigo)
        .maybeSingle();

      if (estoqueExistente) {
        await supabase
          .from("estoque_pdv")
          .update({ quantidade: estoqueExistente.quantidade + qty })
          .eq("id", estoqueExistente.id);
      } else {
        await supabase.from("estoque_pdv").insert({
          pdv_id: selected.pdv_destino_id,
          produto_codigo: selected.produto_codigo,
          produto_descricao: selected.produto_descricao,
          quantidade: qty,
        });
      }
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      action: newStatus === "confirmado" ? "recebimento_confirmado" : "recebimento_divergente",
      module: "Recebimentos",
      usuario: profile?.nome || profile?.email || "Sistema",
      item_description: `${selected.produto_descricao} | Env: ${selected.quantidade} | Rec: ${qty} | Div: ${div}`,
      before_data: { quantidade_enviada: selected.quantidade, status: "pendente" },
      after_data: { quantidade_recebida: qty, divergencia: div, status: newStatus },
      user_id: profile?.user_id || null,
      entity: "movimentacoes_estoque",
      record_id: selected.id,
      device: /Mobi|Android/i.test(navigator.userAgent) ? "Mobile" : "Desktop",
      user_agent: navigator.userAgent.slice(0, 255),
    });

    toast.success(newStatus === "confirmado" ? "Recebimento confirmado!" : "Recebimento registrado com divergência");
    setSelected(null);
    setSaving(false);
    loadData();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="outline" className="border-yellow-500/50 text-yellow-600">Pendente</Badge>;
      case "confirmado":
        return <Badge className="bg-green-600/20 text-green-700 border-green-500/30">Confirmado</Badge>;
      case "divergente":
        return <Badge variant="destructive">Divergente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalPendentes = pendentes.length;
  const totalDivergencias = historico.filter((h) => h.status === "divergente").length;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <PackageCheck className="w-6 h-6 text-primary" />
              Recebimentos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Confirme o recebimento de transferências destinadas ao seu ponto de venda
            </p>
          </div>
          <GlobalDateFilter />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
          <div className="glass-card p-4 md:p-6">
            <p className="text-[10px] md:text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Pendentes</p>
            <p className="text-xl md:text-3xl font-extrabold tracking-tight text-yellow-600">{totalPendentes}</p>
          </div>
          <div className="glass-card p-4 md:p-6">
            <p className="text-[10px] md:text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Confirmados no Período</p>
            <p className="text-xl md:text-3xl font-extrabold tracking-tight text-green-600">
              {historico.filter((h) => h.status === "confirmado").length}
            </p>
          </div>
          <div className="glass-card p-4 md:p-6">
            <p className="text-[10px] md:text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Divergências no Período</p>
            <p className="text-xl md:text-3xl font-extrabold tracking-tight text-destructive">{totalDivergencias}</p>
          </div>
        </div>

        {/* Pending Transfers */}
        {!isAdmin && (
          <>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Transferências Pendentes de Confirmação
            </h2>
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Qtd Enviada</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                      </TableRow>
                    ) : pendentes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhuma transferência pendente
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendentes.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(m.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-sm">{getPdvName(m.pdv_origem_id)}</TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{m.produto_descricao}</div>
                            <div className="text-xs text-muted-foreground">Cód: {m.produto_codigo}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono">{m.quantidade}</Badge>
                          </TableCell>
                          <TableCell>{statusBadge(m.status)}</TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => openConfirm(m)} className="gap-1">
                              <CheckCircle className="w-4 h-4" /> Confirmar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}

        {/* History */}
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Histórico de Recebimentos
        </h2>
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Qtd Enviada</TableHead>
                  <TableHead>Qtd Recebida</TableHead>
                  <TableHead>Divergência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Confirmado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                  </TableRow>
                ) : historico.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum recebimento no período
                    </TableCell>
                  </TableRow>
                ) : (
                  historico.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {m.confirmado_em ? format(new Date(m.confirmado_em), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{getPdvName(m.pdv_origem_id)}</TableCell>
                      <TableCell className="text-sm">{getPdvName(m.pdv_destino_id)}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{m.produto_descricao}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">{m.quantidade}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{m.quantidade_recebida ?? "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        {m.divergencia != null && m.divergencia !== 0 ? (
                          <Badge variant="destructive" className="font-mono">{m.divergencia}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(m.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getProfileName(m.confirmado_por)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar Recebimento</DialogTitle>
              <DialogDescription>
                {selected?.produto_descricao} — Quantidade enviada: <strong>{selected?.quantidade}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Quantidade Recebida *</label>
                <Input
                  type="number"
                  min="0"
                  value={qtdRecebida}
                  onChange={(e) => setQtdRecebida(e.target.value)}
                  placeholder="Ex: 10"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Observação</label>
                <Textarea
                  value={obsRecebimento}
                  onChange={(e) => setObsRecebimento(e.target.value)}
                  placeholder="Observações opcionais..."
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Camera className="w-4 h-4" /> Foto do Recebimento (opcional)
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
              <Button onClick={handleConfirm} disabled={saving}>
                {saving ? "Salvando..." : "Confirmar Recebimento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default RecebimentosPage;
