import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Save, CheckCircle, Store, Trash2, Lock, AlertTriangle, Plus, ClipboardList } from "lucide-react";
import DateRangePicker from "@/components/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useApp } from "@/contexts/AppContext";
import { useEstoqueDiario, type EstoqueDiarioItem } from "@/hooks/useEstoqueDiario";
import { PRODUCT_CATALOG, STORES } from "@/types/inventory";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import FechamentoDiarioEstoque from "@/components/FechamentoDiarioEstoque";

const EstoquePage = () => {
  const { currentRole, dateRange, setDateRange, profile, isOperator, userPdvName, session } = useApp();
  const isMobile = useIsMobile();

  const isAdmin = currentRole === "Administrador" || currentRole === "Admin" || currentRole === "Supervisor";
  const selectedDate = dateRange.from;

  // PDV selection
  const [selectedPdvId, setSelectedPdvId] = useState<string | null>(null);
  const [selectedPdvName, setSelectedPdvName] = useState<string>("");
  const [pdvList, setPdvList] = useState<{ id: string; nome: string }[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Load PDV list
  useEffect(() => {
    const loadPdvs = async () => {
      const { data } = await supabase.from("pontos_de_venda").select("id, nome").eq("status", "ativo").order("nome");
      setPdvList(data || []);
    };
    loadPdvs();
  }, []);

  // Auto-set PDV for operators
  useEffect(() => {
    if (isOperator && profile?.pdv_id) {
      setSelectedPdvId(profile.pdv_id);
      const pdv = pdvList.find((p) => p.id === profile.pdv_id);
      if (pdv) setSelectedPdvName(pdv.nome);
    }
  }, [isOperator, profile, pdvList]);

  // For admins, set first PDV if none selected
  useEffect(() => {
    if (isAdmin && !selectedPdvId && pdvList.length > 0) {
      setSelectedPdvId(pdvList[0].id);
      setSelectedPdvName(pdvList[0].nome);
    }
  }, [isAdmin, selectedPdvId, pdvList]);

  const { diario, itens, setItens, loading, saving, isClosed, saveAndClose, adminUpdate, adminDelete } =
    useEstoqueDiario(selectedPdvId, selectedDate);

  const setSelectedDate = (date: Date) => setDateRange({ from: date, to: date });

  const handlePdvChange = (pdvId: string) => {
    setSelectedPdvId(pdvId);
    const pdv = pdvList.find((p) => p.id === pdvId);
    setSelectedPdvName(pdv?.nome || "");
    setIsEditing(false);
  };

  // Determine if fields should be read-only
  const readOnly = isClosed && !isAdmin ? true : isClosed && isAdmin ? !isEditing : false;

  const updateItem = (idx: number, field: keyof EstoqueDiarioItem, value: string | number) => {
    if (readOnly) return;
    setItens((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const addRow = () => {
    if (readOnly) return;
    setItens((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        produto_codigo: "",
        produto_descricao: "",
        estoque_sistema: 0,
        estoque_loja: 0,
        trincado: 0,
        quebrado: 0,
        observacao: "",
      },
    ]);
  };

  const removeRow = (idx: number) => {
    if (readOnly) return;
    setItens((prev) => prev.filter((_, i) => i !== idx));
  };

  const selectProduct = (idx: number, descricao: string) => {
    if (readOnly) return;
    const product = PRODUCT_CATALOG.find((p) => p.descricao === descricao);
    setItens((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, produto_descricao: descricao, produto_codigo: product?.codigo || "" } : item
      )
    );
  };

  const handleSave = async () => {
    if (!session?.user?.id || !profile?.nome) {
      toast.error("Sessão inválida. Faça login novamente.");
      return;
    }
    await saveAndClose(profile.nome, session.user.id);
  };

  const handleAdminSave = async () => {
    if (!session?.user?.id || !profile?.nome) return;
    const success = await adminUpdate(itens, profile.nome, session.user.id);
    if (success) setIsEditing(false);
  };

  const handleAdminDelete = async () => {
    if (!profile?.nome) return;
    await adminDelete(profile.nome);
  };

  const numFields: { key: keyof EstoqueDiarioItem; label: string }[] = [
    { key: "estoque_sistema", label: "Est. Sistema" },
    { key: "estoque_loja", label: "Est. Loja" },
    { key: "trincado", label: "Trincado" },
    { key: "quebrado", label: "Quebra" },
  ];

  // Hide Est. Sistema for operators
  const visibleFields = isAdmin ? numFields : numFields.filter((f) => f.key !== "estoque_sistema");

  return (
    <>
      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col gap-3 md:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Conferência de Estoque</h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">
              Fechamento diário por PDV — Registro de conferência de mercadorias
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap">
            <DateRangePicker
              from={selectedDate}
              to={selectedDate}
              onChange={({ from }) => { setSelectedDate(from); setIsEditing(false); }}
              align="start"
            />

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Store className="w-4 h-4 text-primary shrink-0" />
              {isOperator ? (
                <div className="flex-1 sm:w-[180px] h-10 md:h-9 text-sm flex items-center px-3 rounded-md border border-input bg-muted/50 text-muted-foreground">
                  {selectedPdvName || userPdvName || "—"}
                </div>
              ) : (
                <Select value={selectedPdvId || ""} onValueChange={handlePdvChange}>
                  <SelectTrigger className="flex-1 sm:w-[200px] h-10 md:h-9 text-sm">
                    <SelectValue placeholder="Selecione o PDV" />
                  </SelectTrigger>
                  <SelectContent>
                    {pdvList.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Status badge */}
            {diario && (
              <Badge variant={isClosed ? "secondary" : "default"} className="gap-1.5">
                {isClosed ? <Lock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                {isClosed ? "Fechado" : "Aberto"}
              </Badge>
            )}

            {/* Admin actions on closed record */}
            {isAdmin && isClosed && !isEditing && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="gap-1.5 h-9">
                  Editar (Admin)
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-1.5 h-9">
                      <Trash2 className="w-4 h-4" /> Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Excluir o fechamento de <strong>{selectedPdvName}</strong> em{" "}
                        <strong>{format(selectedDate, "dd/MM/yyyy")}</strong>? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleAdminDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>

        {/* Closed warning for operators */}
        {isClosed && !isAdmin && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
            <Lock className="w-4 h-4 text-primary" />
            Este fechamento já foi concluído. Somente administradores podem editá-lo.
          </div>
        )}

        {/* Already exists warning when trying to create on a date that already has a closed record */}
        {diario && isClosed && !isAdmin && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm text-warning">
            <AlertTriangle className="w-4 h-4" />
            Fechamento já realizado para {format(selectedDate, "dd/MM/yyyy")} — {selectedPdvName}.
          </div>
        )}

        {/* Tabs: Conferência and Fechamento Diário */}
        <Tabs defaultValue="conferencia" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="conferencia">Conferência</TabsTrigger>
            <TabsTrigger value="fechamento">Fechamento Diário</TabsTrigger>
          </TabsList>

          <TabsContent value="conferencia" className="space-y-4 mt-4">
            {/* Loading state */}
            {loading ? (
              <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground">Carregando...</div>
            ) : (
              <>
                {/* Stock table */}
                {isMobile ? (
                  <MobileStockCards
                    items={itens}
                    readOnly={readOnly}
                    visibleFields={visibleFields}
                    onUpdate={updateItem}
                    onRemove={removeRow}
                    onSelectProduct={selectProduct}
                    onAdd={addRow}
                  />
                ) : (
                  <DesktopStockTable
                    items={itens}
                    readOnly={readOnly}
                    visibleFields={visibleFields}
                    onUpdate={updateItem}
                    onRemove={removeRow}
                    onSelectProduct={selectProduct}
                    onAdd={addRow}
                  />
                )}

                {/* Footer actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    {diario && (
                      <p className="text-xs text-muted-foreground">
                        Criado por: {diario.created_by_name} em {format(new Date(diario.created_at), "dd/MM/yyyy HH:mm")}
                        {diario.updated_by_name && ` • Editado por: ${diario.updated_by_name}`}
                      </p>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="flex gap-2 w-full sm:w-auto">
                      {isEditing && isAdmin ? (
                        <>
                          <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 sm:flex-none">
                            Cancelar
                          </Button>
                          <Button onClick={handleAdminSave} disabled={saving} className="gap-2 flex-1 sm:flex-none h-12 md:h-10">
                            <Save className="w-4 h-4" />
                            {saving ? "Salvando..." : "Salvar Alterações"}
                          </Button>
                        </>
                      ) : !isClosed ? (
                        <Button onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto h-12 md:h-10">
                          <Save className="w-4 h-4" />
                          {saving ? "Salvando..." : "Salvar e Fechar"}
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="fechamento" className="mt-4">
            <FechamentoDiarioEstoque
              pdvId={selectedPdvId}
              pdvName={selectedPdvName}
              date={selectedDate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

// ---- Desktop Table Component ----
interface TableProps {
  items: EstoqueDiarioItem[];
  readOnly: boolean;
  visibleFields: { key: keyof EstoqueDiarioItem; label: string }[];
  onUpdate: (idx: number, field: keyof EstoqueDiarioItem, value: string | number) => void;
  onRemove: (idx: number) => void;
  onSelectProduct: (idx: number, descricao: string) => void;
  onAdd: () => void;
}

const DesktopStockTable = ({ items, readOnly, visibleFields, onUpdate, onRemove, onSelectProduct, onAdd }: TableProps) => (
  <div className="glass-card rounded-2xl overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-foreground">
            <th className="px-3 py-3 text-left font-bold text-[11px] uppercase tracking-[0.1em] text-muted-foreground min-w-[200px]">Produto</th>
            <th className="px-3 py-3 text-center font-bold text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Código</th>
            {visibleFields.map((f) => (
              <th key={f.key} className="px-3 py-3 text-center font-bold text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{f.label}</th>
            ))}
            <th className="px-3 py-3 text-center font-bold text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Faltas</th>
            <th className="px-3 py-3 text-left font-bold text-[11px] uppercase tracking-[0.1em] text-muted-foreground">OBS</th>
            {!readOnly && <th className="px-3 py-3 w-10"></th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const faltas = item.estoque_loja - item.estoque_sistema;
            return (
              <tr key={item.id} className={`border-t border-border/50 transition-colors duration-200 hover:bg-muted/30 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                <td className="px-2 py-1.5">
                  {readOnly ? (
                    <span className="text-sm px-2">{item.produto_descricao || "—"}</span>
                  ) : (
                    <Select value={item.produto_descricao} onValueChange={(v) => onSelectProduct(idx, v)}>
                      <SelectTrigger className="border border-input bg-background h-8 text-sm rounded-md">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_CATALOG.map((p) => (
                          <SelectItem key={p.codigo} value={p.descricao}>{p.descricao}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </td>
                <td className="px-2 py-1.5 text-center">
                  <span className="inline-flex items-center justify-center w-16 h-8 rounded bg-muted text-sm font-medium text-foreground">{item.produto_codigo || "—"}</span>
                </td>
                {visibleFields.map((field) => (
                  <td key={field.key} className="px-2 py-1.5">
                    {readOnly ? (
                      <span className="inline-flex items-center justify-center w-24 h-8 text-sm text-center">{Number(item[field.key]) || 0}</span>
                    ) : (
                      <Input
                        type="number" step="0.5"
                        value={item[field.key] || ""}
                        onChange={(e) => onUpdate(idx, field.key, parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="border border-input bg-background h-8 text-sm text-center w-24 mx-auto rounded-md"
                      />
                    )}
                  </td>
                ))}
                <td className="px-3 py-1.5 text-center">
                  <span className={`inline-flex items-center justify-center w-20 h-8 rounded-full font-bold text-xs ${
                    faltas < 0 ? "bg-destructive/15 text-destructive" : faltas > 0 ? "bg-primary/15 text-primary" : "bg-success/15 text-success"
                  }`}>{faltas.toFixed(1)}</span>
                </td>
                <td className="px-2 py-1.5">
                  {readOnly ? (
                    <span className="text-sm">{item.observacao || "—"}</span>
                  ) : (
                    <Input
                      value={item.observacao}
                      onChange={(e) => onUpdate(idx, "observacao", e.target.value)}
                      placeholder="Anotações"
                      className="border border-input bg-background h-8 text-sm rounded-md"
                    />
                  )}
                </td>
                {!readOnly && (
                  <td className="px-2 py-1.5">
                    <button onClick={() => onRemove(idx)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    {!readOnly && (
      <div className="p-3 border-t border-border/50">
        <Button variant="outline" size="sm" onClick={onAdd} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Adicionar Linha
        </Button>
      </div>
    )}
  </div>
);

// ---- Mobile Cards Component ----
const MobileStockCards = ({ items, readOnly, visibleFields, onUpdate, onRemove, onSelectProduct, onAdd }: TableProps) => (
  <div className="space-y-3">
    {items.map((item, idx) => {
      const faltas = item.estoque_loja - item.estoque_sistema;
      return (
        <div key={item.id} className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              {readOnly ? (
                <p className="text-sm font-medium">{item.produto_descricao || "—"}</p>
              ) : (
                <Select value={item.produto_descricao} onValueChange={(v) => onSelectProduct(idx, v)}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATALOG.map((p) => (
                      <SelectItem key={p.codigo} value={p.descricao}>{p.descricao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {!readOnly && (
              <button onClick={() => onRemove(idx)} className="p-2 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          {item.produto_codigo && <p className="text-xs text-muted-foreground">Código: {item.produto_codigo}</p>}
          <div className="grid grid-cols-2 gap-2">
            {visibleFields.map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{field.label}</label>
                {readOnly ? (
                  <p className="h-10 flex items-center px-3 text-sm bg-muted/50 rounded-md">{Number(item[field.key]) || 0}</p>
                ) : (
                  <Input
                    type="number" step="0.5"
                    value={item[field.key] || ""}
                    onChange={(e) => onUpdate(idx, field.key, parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="h-10 text-sm text-center"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Faltas</span>
            <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-bold text-xs ${
              faltas < 0 ? "bg-destructive/15 text-destructive" : faltas > 0 ? "bg-primary/15 text-primary" : "bg-success/15 text-success"
            }`}>{faltas.toFixed(1)}</span>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">OBS</label>
            {readOnly ? (
              <p className="text-sm">{item.observacao || "—"}</p>
            ) : (
              <Input
                value={item.observacao}
                onChange={(e) => onUpdate(idx, "observacao", e.target.value)}
                placeholder="Anotações"
                className="h-10 text-sm"
              />
            )}
          </div>
        </div>
      );
    })}
    {!readOnly && (
      <Button variant="outline" size="lg" onClick={onAdd} className="gap-1.5 w-full h-12">
        <Plus className="w-4 h-4" /> Adicionar Linha
      </Button>
    )}
  </div>
);

export default EstoquePage;
