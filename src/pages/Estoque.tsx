import { format } from "date-fns";
import { Save, CheckCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import StockTable from "@/components/StockTable";
import { Button } from "@/components/ui/button";
import { useInventory } from "@/contexts/InventoryContext";
import { useApp } from "@/contexts/AppContext";
import { calcularEstoqueFinal } from "@/types/inventory";
import { toast } from "@/components/ui/sonner";

const EstoquePage = () => {
  const { stockItems, setStockItems, saveStock, lastStockSave } = useInventory();
  const { currentRole } = useApp();

  const handleSave = () => {
    // Validations
    for (const item of stockItems) {
      if (!item.descricao) continue; // skip empty rows
      const disponivel = item.estoqueInicial + item.entradas;
      if (item.quantVendida > disponivel) {
        toast.error(`"${item.descricao || "Produto"}": Quantidade vendida (${item.quantVendida}) excede o estoque disponível (${disponivel}).`);
        return;
      }
      if (item.quantVendida + item.trincado + item.quebrado > disponivel) {
        toast.error(`"${item.descricao || "Produto"}": Vendas + perdas (${item.quantVendida + item.trincado + item.quebrado}) excedem estoque disponível (${disponivel}).`);
        return;
      }
      if (currentRole === "Operador") {
        const ef = calcularEstoqueFinal(item);
        if (ef !== item.estoqueInicial + item.entradas - item.quantVendida - item.trincado - item.quebrado) {
          // manual adjustment detected
        }
        if ((item.trincado > 0 || item.quebrado > 0) && !item.obs.trim()) {
          toast.error(`"${item.descricao || "Produto"}": Operadores devem preencher a observação ao registrar perdas.`);
          return;
        }
      }
    }

    saveStock();
    toast.success("Estoque salvo com sucesso!", {
      description: `Registro lançado.`,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Estoque Diário</h1>
            <p className="text-muted-foreground text-sm mt-1">Controle detalhado de estoque</p>
          </div>
          <GlobalDateFilter />
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
