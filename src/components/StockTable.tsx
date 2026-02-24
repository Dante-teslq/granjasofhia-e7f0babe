import { Plus, Trash2 } from "lucide-react";
import { StockItem, PRODUCT_CATALOG } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StockTableProps {
  items: StockItem[];
  onChange: (items: StockItem[]) => void;
}

const emptyItem = (): StockItem => ({
  id: crypto.randomUUID(),
  descricao: "",
  codigo: "",
  estoqueSistema: 0,
  estoqueLoja: 0,
  trincado: 0,
  quebrado: 0,
  faltas: 0,
  obs: "",
});

const StockTable = ({ items, onChange }: StockTableProps) => {
  const updateItem = (id: string, field: keyof StockItem, value: string | number) => {
    onChange(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const selectProduct = (id: string, descricao: string) => {
    const product = PRODUCT_CATALOG.find((p) => p.descricao === descricao);
    onChange(
      items.map((item) =>
        item.id === id
          ? { ...item, descricao, codigo: product?.codigo || "" }
          : item
      )
    );
  };

  const addRow = () => onChange([...items, emptyItem()]);
  const removeRow = (id: string) => onChange(items.filter((item) => item.id !== id));

  const numFields: { key: keyof StockItem; label: string }[] = [
    { key: "estoqueSistema", label: "Est. Sistema" },
    { key: "estoqueLoja", label: "Est. Loja" },
    { key: "trincado", label: "Trincado" },
    { key: "quebrado", label: "Quebra" },
  ];

  return (
    <div className="glass-card rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-foreground">
              <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider min-w-[200px]">Produto</th>
              <th className="px-3 py-3 text-center font-semibold text-xs uppercase tracking-wider">Código</th>
              {numFields.map((f) => (
                <th key={f.key} className="px-3 py-3 text-center font-semibold text-xs uppercase tracking-wider">
                  {f.label}
                </th>
              ))}
              <th className="px-3 py-3 text-center font-semibold text-xs uppercase tracking-wider">
                Faltas
              </th>
              <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider">OBS</th>
              <th className="px-3 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              // Trincados = reclassificação, não perda. Só quebrados entram nas faltas.
              const faltas = item.estoqueLoja - item.estoqueSistema + item.quebrado;
              return (
                <tr
                  key={item.id}
                  className={`border-t border-border transition-colors hover:bg-muted/30 ${
                    idx % 2 === 0 ? "" : "bg-muted/20"
                  }`}
                >
                  <td className="px-2 py-1.5">
                    <Select
                      value={item.descricao}
                      onValueChange={(v) => selectProduct(item.id, v)}
                    >
                      <SelectTrigger className="border border-input bg-background h-8 text-sm rounded-md">
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_CATALOG.map((p) => (
                          <SelectItem key={p.codigo} value={p.descricao}>
                            {p.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span className="inline-flex items-center justify-center w-16 h-8 rounded bg-muted text-sm font-medium text-foreground">
                      {item.codigo || "—"}
                    </span>
                  </td>
                  {numFields.map((field) => (
                    <td key={field.key} className="px-2 py-1.5">
                      <Input
                        type="number"
                        step="0.5"
                        value={item[field.key] || ""}
                        onChange={(e) =>
                          updateItem(item.id, field.key, parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="border border-input bg-background h-8 text-sm text-center w-24 mx-auto rounded-md"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-center">
                    <span className={`inline-flex items-center justify-center w-20 h-8 rounded font-bold text-sm ${
                      faltas < 0 ? "bg-destructive/10 text-destructive" : faltas > 0 ? "bg-primary/10 text-primary" : "bg-success/10 text-success"
                    }`}>
                      {faltas.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={item.obs}
                      onChange={(e) => updateItem(item.id, "obs", e.target.value)}
                      placeholder="Anotações"
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
              );
            })}
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
