import { format } from "date-fns";
import { Save, CheckCircle, Store } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import StockTable from "@/components/StockTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventory } from "@/contexts/InventoryContext";
import { useApp } from "@/contexts/AppContext";
import { STORES } from "@/types/inventory";
import { toast } from "@/components/ui/sonner";

const EstoquePage = () => {
  const { stockItems, setStockItems, saveStock, lastStockSave, currentStore, setCurrentStore } = useInventory();
  const { currentRole } = useApp();

  const handleSave = () => {
    for (const item of stockItems) {
      if (!item.descricao) continue;
      if (currentRole === "Operador") {
        if ((item.trincado > 0 || item.quebrado > 0) && !item.obs.trim()) {
          toast.error(`"${item.descricao}": Operadores devem preencher a observação ao registrar perdas.`);
          return;
        }
      }
    }

    saveStock();
    toast.success("Estoque salvo com sucesso!", {
      description: `Loja: ${currentStore} — Registro lançado.`,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Conferência de Estoque</h1>
            <p className="text-muted-foreground text-sm mt-1">Controle diário por PDV — Estoque Sistema × Estoque Loja</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              <Select value={currentStore} onValueChange={(v) => setCurrentStore(v as any)}>
                <SelectTrigger className="w-[180px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <GlobalDateFilter />
          </div>
        </div>
        <StockTable items={stockItems} onChange={setStockItems} />
        <div className="flex items-center justify-between">
          <div>
            {lastStockSave && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-success" />
                Último salvamento: {format(lastStockSave, "dd/MM/yyyy HH:mm")}
              </p>
            )}
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Salvar Registro
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EstoquePage;
