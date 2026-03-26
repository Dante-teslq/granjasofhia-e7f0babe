import { format } from "date-fns";
import { Lock, Unlock, Save, CheckCircle, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useFechamentoDiario, type FechamentoDiarioItem } from "@/hooks/useFechamentoDiario";
import { useApp } from "@/contexts/AppContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  pdvId: string | null;
  pdvName: string;
  date: Date;
}

export default function FechamentoDiarioEstoque({ pdvId, pdvName, date }: Props) {
  const { currentRole, session, profile } = useApp();
  const isMobile = useIsMobile();
  const isAdmin = currentRole === "Administrador" || currentRole === "Admin" || currentRole === "Supervisor";

  const { items, loading, saving, isClosed, updateItem, closeDay, reopenDay } =
    useFechamentoDiario(pdvId, date);

  const readOnly = isClosed && !isAdmin;

  const handleClose = async () => {
    if (!session?.user?.id || !profile?.nome) return;
    await closeDay(profile.nome, session.user.id);
  };

  const handleReopen = async () => {
    if (!session?.user?.id || !profile?.nome) return;
    await reopenDay(profile.nome, session.user.id);
  };

  // Summary totals
  const totalInicial = items.reduce((s, i) => s + i.estoque_inicial, 0);
  const totalEntradas = items.reduce((s, i) => s + i.total_entradas, 0);
  const totalSaidas = items.reduce((s, i) => s + i.total_saidas, 0);
  const totalAjustes = items.reduce((s, i) => s + i.total_ajustes, 0);
  const totalFinal = items.reduce((s, i) => s + i.estoque_final, 0);

  if (loading) {
    return <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground">Carregando fechamento...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-primary" />
              Fechamento Diário — {pdvName}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={isClosed ? "secondary" : "default"} className="gap-1.5">
                {isClosed ? <Lock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                {isClosed ? "Fechado" : "Aberto"}
              </Badge>
              {isClosed && items[0]?.fechado_em && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(items[0].fechado_em), "dd/MM/yyyy HH:mm")}
                  {items[0].fechado_por && ` — ${items[0].fechado_por}`}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <SummaryCard label="Est. Inicial" value={totalInicial} />
            <SummaryCard label="Entradas" value={totalEntradas} color="text-primary" />
            <SummaryCard label="Saídas" value={totalSaidas} color="text-destructive" />
            <SummaryCard label="Ajustes" value={totalAjustes} color="text-warning" />
            <SummaryCard label="Est. Final" value={totalFinal} highlight />
          </div>
        </CardContent>
      </Card>

      {/* Closed warning */}
      {isClosed && !isAdmin && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
          <Lock className="w-4 h-4 text-primary" />
          Dia fechado. Somente administradores podem reabrir.
        </div>
      )}

      {/* Items table */}
      {isMobile ? (
        <MobileCards items={items} readOnly={readOnly} onUpdate={updateItem} />
      ) : (
        <DesktopTable items={items} readOnly={readOnly} onUpdate={updateItem} />
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {items[0]?.reaberto_em && (
          <p className="text-xs text-muted-foreground">
            Última reabertura: {format(new Date(items[0].reaberto_em), "dd/MM/yyyy HH:mm")}
            {items[0].reaberto_por && ` por ${items[0].reaberto_por}`}
          </p>
        )}
        <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
          {isAdmin && isClosed && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5" disabled={saving}>
                  <Unlock className="w-4 h-4" /> Reabrir Dia
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reabrir dia?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O dia {format(date, "dd/MM/yyyy")} será reaberto para edição. O estoque inicial do dia seguinte poderá ser afetado após um novo fechamento.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReopen}>Reabrir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {!isClosed && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="gap-2 flex-1 sm:flex-none h-12 md:h-10" disabled={saving}>
                  <Save className="w-4 h-4" />
                  {saving ? "Fechando..." : "Fechar Dia"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Fechar o dia?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O estoque final de {format(date, "dd/MM/yyyy")} será salvo e transferido como estoque inicial do dia seguinte. Após o fechamento, somente administradores poderão reabrir.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClose}>Fechar Dia</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, highlight }: { label: string; value: number; color?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-2.5 text-center ${highlight ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${highlight ? "text-primary" : color || "text-foreground"}`}>{value.toFixed(1)}</p>
    </div>
  );
}

function DesktopTable({ items, readOnly, onUpdate }: { items: FechamentoDiarioItem[]; readOnly: boolean; onUpdate: (idx: number, field: keyof FechamentoDiarioItem, value: number) => void }) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-3 py-3 text-left font-bold text-[11px] uppercase tracking-[0.1em] text-muted-foreground min-w-[180px]">Produto</th>
              <th className="px-3 py-3 text-center font-bold text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Cód</th>
              <th className="px-3 py-3 text-center font-bold text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Est. Inicial</th>
              <th className="px-3 py-3 text-center font-bold text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Entradas</th>
              <th className="px-3 py-3 text-center font-bold text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Saídas</th>
              <th className="px-3 py-3 text-center font-bold text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Ajustes</th>
              <th className="px-3 py-3 text-center font-bold text-[11px] uppercase tracking-[0.1em] text-primary">Est. Final</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx} className={`border-t border-border/50 hover:bg-muted/30 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                <td className="px-3 py-1.5 text-sm font-medium">{item.produto_descricao}</td>
                <td className="px-3 py-1.5 text-center">
                  <span className="inline-flex items-center justify-center w-12 h-8 rounded bg-muted text-sm font-medium">{item.produto_codigo}</span>
                </td>
                <td className="px-2 py-1.5 text-center">
                  <span className="inline-flex items-center justify-center w-20 h-8 rounded bg-muted/50 text-sm">{item.estoque_inicial.toFixed(1)}</span>
                </td>
                {(["total_entradas", "total_saidas", "total_ajustes"] as const).map((field) => (
                  <td key={field} className="px-2 py-1.5">
                    {readOnly ? (
                      <span className="inline-flex items-center justify-center w-20 h-8 text-sm text-center mx-auto">{Number(item[field]).toFixed(1)}</span>
                    ) : (
                      <Input
                        type="number"
                        step="0.5"
                        value={item[field] || ""}
                        onChange={(e) => onUpdate(idx, field, parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="border border-input bg-background h-8 text-sm text-center w-20 mx-auto rounded-md"
                      />
                    )}
                  </td>
                ))}
                <td className="px-3 py-1.5 text-center">
                  <span className="inline-flex items-center justify-center w-20 h-8 rounded-full font-bold text-xs bg-primary/15 text-primary">
                    {item.estoque_final.toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MobileCards({ items, readOnly, onUpdate }: { items: FechamentoDiarioItem[]; readOnly: boolean; onUpdate: (idx: number, field: keyof FechamentoDiarioItem, value: number) => void }) {
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={item.id || idx} className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{item.produto_descricao}</p>
            <span className="text-xs text-muted-foreground">Cód: {item.produto_codigo}</span>
          </div>
          <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Est. Inicial</span>
            <span className="text-sm font-medium">{item.estoque_inicial.toFixed(1)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["total_entradas", "total_saidas", "total_ajustes"] as const).map((field) => {
              const labels: Record<string, string> = {
                total_entradas: "Entradas",
                total_saidas: "Saídas",
                total_ajustes: "Ajustes",
              };
              return (
                <div key={field} className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{labels[field]}</label>
                  {readOnly ? (
                    <p className="h-10 flex items-center justify-center px-2 text-sm bg-muted/50 rounded-md">{Number(item[field]).toFixed(1)}</p>
                  ) : (
                    <Input
                      type="number"
                      step="0.5"
                      value={item[field] || ""}
                      onChange={(e) => onUpdate(idx, field, parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="h-10 text-sm text-center"
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between bg-primary/10 rounded-lg px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Est. Final</span>
            <span className="text-sm font-bold text-primary">{item.estoque_final.toFixed(1)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
