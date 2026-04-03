import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Package, ArrowDownUp } from "lucide-react";

interface OmieConta {
  id: string;
  pdv_nome: string;
  omie_app_key: string;
  descricao: string;
}

interface AjusteEstoque {
  data: string;
  id_prod: string | number;
  tipo: string;
  quantidade: number;
  valor: number;
  origem: string;
  observacao: string;
}

export default function IntegracoesOmie() {
  const { toast } = useToast();
  const [contas, setContas] = useState<OmieConta[]>([]);
  const [selectedConta, setSelectedConta] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingContas, setLoadingContas] = useState(true);
  const [ajustes, setAjustes] = useState<AjusteEstoque[]>([]);
  const [pdvNome, setPdvNome] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    supabase
      .from("omie_contas")
      .select("id, pdv_nome, omie_app_key, descricao")
      .then(({ data, error }) => {
        if (data) setContas(data as OmieConta[]);
        if (error) toast({ title: "Erro ao carregar contas", description: error.message, variant: "destructive" });
        setLoadingContas(false);
      });
  }, []);

  const buscarMovimentos = async (contaId: string) => {
    setLoading(true);
    setSelectedConta(contaId);
    setAjustes([]);

    try {
      const params: Record<string, unknown> = { omie_conta_id: contaId };
      if (dataInicio) params.data_inicio = dataInicio;
      if (dataFim) params.data_fim = dataFim;

      const { data, error } = await supabase.functions.invoke("omie-ajustes", { body: params });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Erro desconhecido");

      setPdvNome(data.pdv_nome || "");

      // Parse Omie response
      const omieData = data.data;
      const registros: AjusteEstoque[] = [];

      const ajustesList = omieData?.ajustes_estoque || omieData?.produto_estoque || [];

      if (Array.isArray(ajustesList)) {
        for (const item of ajustesList) {
          registros.push({
            data: item.dDtAjuste || item.data || "",
            id_prod: item.nCodProd || item.id_prod || item.codigo_produto || "",
            tipo: item.cTipoAjuste || item.tipo || (item.nQtde > 0 ? "ENT" : "SAI"),
            quantidade: Math.abs(item.nQtde || item.quantidade || 0),
            valor: item.nValUnit || item.valor_unitario || 0,
            origem: item.cOrigem || item.origem || item.cObsAjuste || "",
            observacao: item.cObsAjuste || item.obs || "",
          });
        }
      }

      setAjustes(registros);

      if (registros.length === 0) {
        toast({ title: "Nenhum movimento encontrado", description: "A consulta não retornou registros para este PDV." });
      }
    } catch (err: any) {
      toast({ title: "Erro ao buscar movimentos", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const ajustesFiltrados = ajustes.filter((a) => {
    if (filtroTipo === "entrada") return a.tipo === "ENT" || a.tipo === "Entrada";
    if (filtroTipo === "saida") return a.tipo === "SAI" || a.tipo === "Saída";
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Movimentos Omie por PDV</h1>
        <p className="text-sm text-muted-foreground">Consulte ajustes de estoque diretamente no ERP Omie</p>
      </div>

      {/* Filtros de data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label className="text-xs">Data início (dd/mm/aaaa)</Label>
              <Input
                placeholder="01/01/2025"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs">Data fim (dd/mm/aaaa)</Label>
              <Input
                placeholder="31/12/2025"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de PDVs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loadingContas ? (
          <div className="col-span-full flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : contas.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma conta Omie cadastrada</p>
          </div>
        ) : (
          contas.map((conta) => (
            <Card
              key={conta.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedConta === conta.id ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{conta.pdv_nome}</h3>
                  <Badge variant="outline" className="text-xs">
                    {conta.omie_app_key.slice(0, 8)}...
                  </Badge>
                </div>
                {conta.descricao && (
                  <p className="text-xs text-muted-foreground mb-3">{conta.descricao}</p>
                )}
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => buscarMovimentos(conta.id)}
                  disabled={loading && selectedConta === conta.id}
                >
                  {loading && selectedConta === conta.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Search className="w-4 h-4 mr-1" />
                  )}
                  Ver Movimentos
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Resultados */}
      {ajustes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowDownUp className="w-4 h-4" />
                Movimentos — {pdvNome}
              </CardTitle>
              <Badge variant="secondary">{ajustesFiltrados.length} registros</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto (ID)</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ajustesFiltrados.map((ajuste, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="whitespace-nowrap">{ajuste.data}</TableCell>
                      <TableCell>{ajuste.id_prod}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            ajuste.tipo === "ENT" || ajuste.tipo === "Entrada"
                              ? "border-green-500/40 text-green-700"
                              : "border-red-500/40 text-red-700"
                          }
                        >
                          {ajuste.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{ajuste.quantidade}</TableCell>
                      <TableCell className="text-right">
                        {ajuste.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">{ajuste.origem}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{ajuste.observacao}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
