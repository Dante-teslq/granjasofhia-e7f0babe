import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOmieIntegrations, OmieIntegration } from "@/hooks/useOmieIntegrations";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, TestTube, Plug, RefreshCw, AlertTriangle, CheckCircle2, Clock, XCircle, RotateCcw, Trash2, Edit } from "lucide-react";

interface PdvOption {
  id: string;
  nome: string;
}

const statusColors: Record<string, string> = {
  success: "bg-green-500/10 text-green-700 border-green-500/30",
  failed: "bg-red-500/10 text-red-700 border-red-500/30",
  pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  retrying: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  processing: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  dead_letter: "bg-red-500/10 text-red-800 border-red-500/40",
  canceled: "bg-muted text-muted-foreground border-muted",
};

const StatusBadge = ({ status }: { status: string }) => (
  <Badge variant="outline" className={statusColors[status] || ""}>{status}</Badge>
);

const envLabels: Record<string, string> = {
  production: "Produção",
  sandbox: "Sandbox",
  homologation: "Homologação",
};

export default function Integracoes() {
  const {
    integrations, logs, queue, failures, loading,
    fetchIntegrations, fetchLogs, fetchQueue, fetchFailures,
    createIntegration, updateIntegration, deleteIntegration,
    testConnection, retryFailed,
  } = useOmieIntegrations();

  const { toast } = useToast();
  const [pdvs, setPdvs] = useState<PdvOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    integration_name: "",
    pdv_id: "",
    omie_app_key: "",
    omie_app_secret: "",
    environment: "production",
    inheritance_level: "pdv",
    is_active: true,
    customers_sync_mode: "async",
    products_sync_mode: "async",
    orders_sync_mode: "sync",
    inventory_sync_mode: "async",
  });

  useEffect(() => {
    fetchIntegrations();
    fetchLogs();
    fetchQueue();
    fetchFailures();
    supabase.from("pontos_de_venda").select("id, nome").eq("status", "ativo").then(({ data }) => {
      setPdvs((data as PdvOption[]) || []);
    });
  }, []);

  const resetForm = () => {
    setForm({
      integration_name: "", pdv_id: "", omie_app_key: "", omie_app_secret: "",
      environment: "production", inheritance_level: "pdv", is_active: true,
      customers_sync_mode: "async", products_sync_mode: "async",
      orders_sync_mode: "sync", inventory_sync_mode: "async",
    });
    setEditingId(null);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        pdv_id: form.pdv_id || null,
      };
      if (editingId) {
        await updateIntegration(editingId, payload);
        toast({ title: "Integração atualizada com sucesso" });
      } else {
        await createIntegration(payload);
        toast({ title: "Integração criada com sucesso" });
      }
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleEdit = (integ: OmieIntegration) => {
    setForm({
      integration_name: integ.integration_name,
      pdv_id: integ.pdv_id || "",
      omie_app_key: integ.omie_app_key,
      omie_app_secret: integ.omie_app_secret,
      environment: integ.environment,
      inheritance_level: integ.inheritance_level,
      is_active: integ.is_active,
      customers_sync_mode: integ.customers_sync_mode,
      products_sync_mode: integ.products_sync_mode,
      orders_sync_mode: integ.orders_sync_mode,
      inventory_sync_mode: integ.inventory_sync_mode,
    });
    setEditingId(integ.id);
    setDialogOpen(true);
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await testConnection(id);
      toast({
        title: result.success ? "Conexão OK" : "Falha na conexão",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (err: any) {
      toast({ title: "Erro no teste", description: err.message, variant: "destructive" });
    } finally {
      setTestingId(null);
    }
  };

  const handleRetry = async (failureId: string) => {
    try {
      const result = await retryFailed(failureId);
      toast({ title: result.message || "Reenfileirado" });
      fetchFailures();
      fetchQueue();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta integração?")) return;
    try {
      await deleteIntegration(id);
      toast({ title: "Integração excluída" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const successCount = logs.filter((l) => l.execution_status === "success").length;
  const failedCount = logs.filter((l) => l.execution_status === "failed").length;
  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const deadCount = queue.filter((q) => q.status === "dead_letter").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrações Omie</h1>
          <p className="text-sm text-muted-foreground">Gerencie conexões com o ERP Omie por PDV</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchIntegrations(); fetchLogs(); fetchQueue(); fetchFailures(); }}>
            <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Integração</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar" : "Nova"} Integração Omie</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Nome da integração</Label>
                  <Input value={form.integration_name} onChange={(e) => setForm({ ...form, integration_name: e.target.value })} placeholder="Ex: Omie PDV CEASA" />
                </div>
                <div>
                  <Label>PDV vinculado</Label>
                  <Select value={form.pdv_id} onValueChange={(v) => setForm({ ...form, pdv_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o PDV" /></SelectTrigger>
                    <SelectContent>
                      {pdvs.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>App Key</Label>
                    <Input type="password" value={form.omie_app_key} onChange={(e) => setForm({ ...form, omie_app_key: e.target.value })} />
                  </div>
                  <div>
                    <Label>App Secret</Label>
                    <Input type="password" value={form.omie_app_secret} onChange={(e) => setForm({ ...form, omie_app_secret: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Ambiente</Label>
                    <Select value={form.environment} onValueChange={(v) => setForm({ ...form, environment: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="production">Produção</SelectItem>
                        <SelectItem value="sandbox">Sandbox</SelectItem>
                        <SelectItem value="homologation">Homologação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nível de herança</Label>
                    <Select value={form.inheritance_level} onValueChange={(v) => setForm({ ...form, inheritance_level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdv">PDV</SelectItem>
                        <SelectItem value="unit">Unidade</SelectItem>
                        <SelectItem value="company">Empresa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Clientes</Label>
                    <Select value={form.customers_sync_mode} onValueChange={(v) => setForm({ ...form, customers_sync_mode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sync">Síncrono</SelectItem>
                        <SelectItem value="async">Assíncrono</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Produtos</Label>
                    <Select value={form.products_sync_mode} onValueChange={(v) => setForm({ ...form, products_sync_mode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sync">Síncrono</SelectItem>
                        <SelectItem value="async">Assíncrono</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Pedidos</Label>
                    <Select value={form.orders_sync_mode} onValueChange={(v) => setForm({ ...form, orders_sync_mode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sync">Síncrono</SelectItem>
                        <SelectItem value="async">Assíncrono</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Estoque</Label>
                    <Select value={form.inventory_sync_mode} onValueChange={(v) => setForm({ ...form, inventory_sync_mode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sync">Síncrono</SelectItem>
                        <SelectItem value="async">Assíncrono</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Integração ativa</Label>
                </div>
                <Button onClick={handleSave} className="w-full">{editingId ? "Salvar alterações" : "Criar integração"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Omie Movimentos Card */}
      <OmieMovimentosCard />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Plug className="w-4 h-4 text-primary" />
              <span className="text-2xl font-bold">{integrations.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Integrações</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-2xl font-bold">{successCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Sucesso</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-2xl font-bold">{pendingCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-2xl font-bold">{failedCount + deadCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Falhas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="integrations">
        <TabsList className="w-full max-w-2xl h-auto flex-wrap">
          <TabsTrigger value="integrations" className="text-xs md:text-sm">Integrações</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs md:text-sm">Logs</TabsTrigger>
          <TabsTrigger value="queue" className="text-xs md:text-sm">Fila</TabsTrigger>
          <TabsTrigger value="failures" className="text-xs md:text-sm">Falhas</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Integrações configuradas</CardTitle></CardHeader>
            <CardContent>
              {integrations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma integração configurada</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>PDV</TableHead>
                        <TableHead>Ambiente</TableHead>
                        <TableHead>Nível</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {integrations.map((integ) => (
                        <TableRow key={integ.id}>
                          <TableCell className="font-medium">{integ.integration_name}</TableCell>
                          <TableCell>{integ.pdv_nome || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={integ.environment === "production" ? "border-green-500/40 text-green-700" : "border-yellow-500/40 text-yellow-700"}>
                              {envLabels[integ.environment] || integ.environment}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">{integ.inheritance_level}</TableCell>
                          <TableCell>
                            <Badge variant={integ.is_active ? "default" : "secondary"}>
                              {integ.is_active ? "Ativa" : "Inativa"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleTest(integ.id)} disabled={testingId === integ.id} title="Testar conexão">
                                <TestTube className={`w-4 h-4 ${testingId === integ.id ? "animate-spin" : ""}`} />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(integ)} title="Editar">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(integ.id)} title="Excluir" className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Logs de integração
                <Button variant="outline" size="sm" onClick={() => fetchLogs()}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Operação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>HTTP</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum log</TableCell></TableRow>
                    ) : logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-xs">{log.entity_type}</TableCell>
                        <TableCell className="text-xs">{log.operation_type}</TableCell>
                        <TableCell><StatusBadge status={log.execution_status} /></TableCell>
                        <TableCell className="text-xs">{log.http_status || "—"}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={log.error_message || ""}>{log.error_message || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Fila de processamento
                <Button variant="outline" size="sm" onClick={() => fetchQueue()}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Operação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tentativas</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queue.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Fila vazia</TableCell></TableRow>
                    ) : queue.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(item.created_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-xs">{item.entity_type}</TableCell>
                        <TableCell className="text-xs">{item.operation_type}</TableCell>
                        <TableCell><StatusBadge status={item.status} /></TableCell>
                        <TableCell className="text-xs">{item.attempt_count}/{item.max_attempts}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{item.last_error || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failures" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Falhas não resolvidas
                </span>
                <Button variant="outline" size="sm" onClick={() => fetchFailures()}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failures.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma falha pendente</TableCell></TableRow>
                    ) : failures.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(f.created_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-xs">{f.entity_type}</TableCell>
                        <TableCell className="text-xs max-w-[300px] truncate">{f.failure_reason}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleRetry(f.id)}>
                            <RotateCcw className="w-3 h-3 mr-1" /> Reenviar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
