import { Plus, Trash2 } from "lucide-react";
import { SangriaItem } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SangriasTableProps {
  items: SangriaItem[];
  onChange: (items: SangriaItem[]) => void;
}

const emptySangria = (): SangriaItem => ({
  id: crypto.randomUUID(),
  sangria: "",
  cartelasVazias: "",
  barbantes: "",
  notacoes: "",
});

const SangriasTable = ({ items, onChange }: SangriasTableProps) => {
  const updateItem = (id: string, field: keyof SangriaItem, value: string) => {
    onChange(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addRow = () => onChange([...items, emptySangria()]);
  const removeRow = (id: string) => onChange(items.filter((item) => item.id !== id));

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary/10 text-foreground">
              <th className="px-3 py-3 text-left font-semibold">Sangria</th>
              <th className="px-3 py-3 text-left font-semibold">Cartelas Vazias</th>
              <th className="px-3 py-3 text-left font-semibold">Barbantes</th>
              <th className="px-3 py-3 text-left font-semibold">Campo de Notações</th>
              <th className="px-3 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr
                key={item.id}
                className={`border-t border-border transition-colors hover:bg-muted/50 ${
                  idx % 2 === 0 ? "" : "bg-muted/30"
                }`}
              >
                <td className="px-2 py-1.5">
                  <Input
                    value={item.sangria}
                    onChange={(e) => updateItem(item.id, "sangria", e.target.value)}
                    className="border border-input bg-background h-8 text-sm rounded-md"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={item.cartelasVazias}
                    onChange={(e) => updateItem(item.id, "cartelasVazias", e.target.value)}
                    className="border border-input bg-background h-8 text-sm rounded-md"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={item.barbantes}
                    onChange={(e) => updateItem(item.id, "barbantes", e.target.value)}
                    className="border border-input bg-background h-8 text-sm rounded-md"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={item.notacoes}
                    onChange={(e) => updateItem(item.id, "notacoes", e.target.value)}
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

export default SangriasTable;
