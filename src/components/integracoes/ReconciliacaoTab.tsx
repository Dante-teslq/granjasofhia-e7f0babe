import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RefreshCw, CheckCircle2, EyeOff, AlertTriangle, ArrowRight,
  CheckCheck, Package2, HelpCircle,
} from "lucide-react";
import { useOmieReconciliacao, type ComparacaoItem, type IntegracaoOpcao } from "@/hooks/useOmieReconciliacao";
import { useToast } from "@/hooks/use-toast";

const situacaoBadge: Record<string, { label: string; className: string }> = {
  divergente:     { label: "Divergente",     className: "bg-red-500/10 text-red-700 border-red-500/30" },
  apenas_sistema: { label: "Só no sistema",  className: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30" },
  apenas_omie:    { label: "Só no Omie",     className: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  ok:             { label: "OK",             className: "bg-green-500/10 text-green-700 border-green-500/30" },
};

const statusHistBadge: Record<string, string> = {
  pendente: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  revisado: "bg-green-500/10 text-green-700 border-green-500/30",
  ignorado: "bg-muted text-muted-foreground border-muted",
};

export default function ReconciliacaoTab() {
  const { toast } = useToast();
  const {
    integracoes, loadingIntegracoes, fetchIntegracoes,
    loading, comparacao, comparar,
    historico, fetchHistorico,
    salvarRevisao, integracaoAtiva,
  } = useOmieReconciliacao();

  const [selectedId, setSelectedId] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => { fetchIntegracoes(); }, [fetchIntegracoes]);

  useEffect(() => {
    if (selectedId) {
      fetchHistorico(selectedId);
    }
  }, [selectedId, fetchHistorico]);

  const integracaoSelecionada: IntegracaoOpcao | undefined =
    integracoes.find((i) => i.id === selectedId);

  const handleComparar = () => {
    if (!integracaoSelecionada) return;
    comparar(integracaoSelecionada);
  };

  const handleSalvarRevisao = async (item: ComparacaoItem, status: "revisado" | "ignorado") => {
    if (!integracaoAtiva?.id || !integracaoAtiva.pdv_id) return;
    setSavingId(item.produto_codigo);
    try {
      await salvarRevisao(item, integracaoAtiva.id, integracaoAtiva.pdv_id, status);
      toast({ title: status === "revisado" ? "Marcado como revisado" : "Divergência ignorada" });
      fetchHistorico(integracaoAtiva.id);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const totalDivergentes = comparacao.filter((r) => r.situacao !== "ok").length;
  const totalOk = comparacao.filter((r) => r.situacao === "ok").length;

  return (
    <div className="space-y-4">
      {/* Seletor de integração + botão comparar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package2 className="w-4 h-4 text-primary" />
            Comparar Estoque com Omie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Selecione uma integração para puxar a posição de estoque diretamente do Omie e comparar com os dados do sistema.
            Nenhum dado é alterado — a correção deve ser feita manualmente no aplicativo Omie.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-foreground mb-1 block">Integração / PDV</label>
              <Select value={selectedId} onValueChange={setSelectedId} disabled={loadingIntegracoes}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingIntegracoes ? "Carregando..." : "Selecione uma integração"} />
                </SelectTrigger>
                <SelectContent>
                  {integracoes.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.integration_name}
                      {i.pdv_nome ? ` — ${i.pdv_nome}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleComparar}
              disabled={!selectedId || loading || !integracaoSelecionada?.pdv_id}
              className="sm:w-auto w-full"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Comparando..." : "Comparar com Omie"}
            </Button>
          </div>

          {selectedId && !integracaoSelecionada?.pdv_id && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                Esta integração não tem um PDV vinculado. Edite-a e associe um PDV antes de comparar.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Resultado da comparação */}
      {comparacao.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-base">
                Resultado — {integracaoAtiva?.integration_name}
                {integracaoAtiva?.pdv_nome ? ` (${integracaoAtiva.pdv_nome})` : ""}
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                {totalDivergentes > 0 && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/30">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {totalDivergentes} incompatibilidade{totalDivergentes > 1 ? "s" : ""}
                  </Badge>
                )}
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                  <CheckCheck className="w-3 h-3 mr-1" />
                  {totalOk} compatível{totalOk !== 1 ? "is" : ""}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Orientação para correção */}
            {totalDivergentes > 0 && (
              <Alert className="mb-4 border-yellow-500/30 bg-yellow-500/5">
                <HelpCircle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-xs text-yellow-700">
                  Para corrigir as divergências, acesse o aplicativo Omie e ajuste manualmente as quantidades do estoque.
                  Após corrigir, volte aqui e marque a linha como <strong>Revisado</strong> para registrar o acompanhamento.
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="divergentes">
              <TabsList className="mb-3">
                <TabsTrigger value="divergentes">
                  Incompatíveis ({totalDivergentes})
                </TabsTrigger>
                <TabsTrigger value="todos">
                  Todos ({comparacao.length})
                </TabsTrigger>
              </TabsList>

              {(["divergentes", "todos"] as const).map((tab) => {
                const rows = tab === "divergentes"
                  ? comparacao.filter((r) => r.situacao !== "ok")
                  : comparacao;

                return (
                  <TabsContent key={tab} value={tab}>
                    {rows.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                        <CheckCheck className="w-8 h-8 opacity-30" />
                        <p className="text-sm">Nenhuma incompatibilidade — estoque alinhado com o Omie</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produto</TableHead>
                              <TableHead className="text-right">Sistema</TableHead>
                              <TableHead className="text-right">Omie</TableHead>
                              <TableHead className="text-right">Diferença</TableHead>
                              <TableHead>Situação</TableHead>
                              <TableHead className="text-right">Ação</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((r) => {
                              const badge = situacaoBadge[r.situacao];
                              const isSaving = savingId === r.produto_codigo;
                              return (
                                <TableRow key={r.produto_codigo} className={r.situacao === "ok" ? "opacity-50" : ""}>
                                  <TableCell>
                                    <p className="text-sm font-medium leading-tight">{r.produto_descricao}</p>
                                    <span className="text-[10px] text-muted-foreground">{r.produto_codigo}</span>
                                  </TableCell>
                                  <TableCell className="text-right text-sm">{r.saldo_sistema}</TableCell>
                                  <TableCell className="text-right text-sm">{r.saldo_omie}</TableCell>
                                  <TableCell className={`text-right text-sm font-bold ${r.divergencia !== 0 ? "text-destructive" : "text-green-600"}`}>
                                    {r.divergencia > 0 ? `+${r.divergencia}` : r.divergencia}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={`text-[10px] ${badge.className}`}>
                                      {badge.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {r.situacao !== "ok" && (
                                      <div className="flex items-center justify-end gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          disabled={isSaving}
                                          onClick={() => handleSalvarRevisao(r, "revisado")}
                                          title="Marcar como revisado no Omie"
                                          className="h-7 w-7"
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          disabled={isSaving}
                                          onClick={() => handleSalvarRevisao(r, "ignorado")}
                                          title="Ignorar divergência"
                                          className="h-7 w-7"
                                        >
                                          <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                                        </Button>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Histórico de reconciliações */}
      {selectedId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Histórico de Revisões
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => fetchHistorico(selectedId)}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {historico.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhuma revisão registrada para esta integração</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Sistema</TableHead>
                      <TableHead className="text-right">Omie</TableHead>
                      <TableHead className="text-right">Dif.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Revisado por</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historico.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(r.data).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-xs">
                          <p className="font-medium">{r.produto_descricao}</p>
                          <span className="text-muted-foreground">{r.produto_codigo}</span>
                        </TableCell>
                        <TableCell className="text-right text-xs">{r.saldo_interno}</TableCell>
                        <TableCell className="text-right text-xs">{r.saldo_omie}</TableCell>
                        <TableCell className={`text-right text-xs font-bold ${r.divergencia !== 0 ? "text-destructive" : "text-green-600"}`}>
                          {r.divergencia > 0 ? `+${r.divergencia}` : r.divergencia}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${statusHistBadge[r.status] || ""}`}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.revisado_por || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
