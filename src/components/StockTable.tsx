import { Plus, Trash2, Lock } from "lucide-react";
import { StockItem, calcularEstoqueFinal } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StockTableProps {
  items: StockItem[];
  onChange: (items: StockItem[]) => void;
}

const emptyItem = (): StockItem => ({
  id: crypto.randomUUID(),
  descricao: "",
  codigo: "",
  estoqueInicial: 0,
  entradas: 0,
  quantVendida: 0,
  trincado: 0,
  quebrado: 0,
  obs: "",
});

const StockTable = ({ items, onChange }: StockTableProps) => {
  const updateItem = (id: string, field: keyof StockItem, value: string | number) => {
    onChange(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addRow = () => onChange([...items, emptyItem()]);
  const removeRow = (id: string) => onChange(items.filter((item) => item.id !== id));

  const numFields: (keyof StockItem)[] = [
    "estoqueInicial",
    "entradas",
    "quantVendida",
    "trincado",
    "quebrado",
  ];

  const fieldLabels: Record<string, string> = {
    estoqueInicial: "Est. Inicial",
    entradas: "Entradas",
    quantVendida: "Qt. Vendida",
    trincado: "Trincado",
    quebrado: "Quebrado",
  };

  return (
    <div className="glass-card rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-foreground">
              <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider">Descrição do Produto</th>
              <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider">Código</th>
              {numFields.map((f) => (
                <th key={f} className="px-3 py-3 text-center font-semibold text-xs uppercase tracking-wider">
                  {fieldLabels[f]}
                </th>
              ))}
              <th className="px-3 py-3 text-center font-semibold text-xs uppercase tracking-wider">
                <div className="flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3 text-primary" />
                  Est. Final
                </div>
              </th>
              <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider">OBS</th>
              <th className="px-3 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr
                key={item.id}
                className={`border-t border-border transition-colors hover:bg-muted/30 ${
                  idx % 2 === 0 ? "" : "bg-muted/20"
                }`}
              >
                <td className="px-2 py-1.5">
                  <Input
                    value={item.descricao}
                    onChange={(e) => updateItem(item.id, "descricao", e.target.value)}
                    placeholder="Ex: Ovo tipo A"
                    className="border border-input bg-background h-8 text-sm rounded-md"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={item.codigo}
                    onChange={(e) => updateItem(item.id, "codigo", e.target.value)}
                    placeholder="000"
                    className="border border-input bg-background h-8 text-sm w-20 rounded-md"
                  />
                </td>
                {numFields.map((field) => (
                  <td key={field} className="px-2 py-1.5">
                    <Input
                      type="number"
                      min={0}
                      value={item[field] || ""}
                      onChange={(e) =>
                        updateItem(item.id, field, parseInt(e.target.value) || 0)
                      }
                      className="border border-input bg-background h-8 text-sm text-center w-20 mx-auto rounded-md"
                    />
                  </td>
                ))}
                <td className="px-3 py-1.5 text-center">
                  <span className="inline-flex items-center justify-center w-16 h-8 rounded bg-primary/10 font-bold text-primary text-sm">
                    {calcularEstoqueFinal(item)}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={item.obs}
                    onChange={(e) => updateItem(item.id, "obs", e.target.value)}
                    placeholder="—"
                    className="border border-input bg-background h-8 text-sm rounded-md"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => removeRow(item.id)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-3 border-t border-border">
        <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Adicionar Linha
        </Button>
      </div>
    </div>
  );
};

export default StockTable;
