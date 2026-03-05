import { Plus, Trash2 } from "lucide-react";
import { SangriaItem } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";

interface SangriasTableProps {
  items: SangriaItem[];
  onChange: (items: SangriaItem[]) => void;
  readOnly?: boolean;
}

const emptySangria = (): SangriaItem => ({
  id: crypto.randomUUID(),
  sangria: "",
  cartelasVazias: "",
  barbantes: "",
  notacoes: "",
  pontoVenda: "",
});

const SangriasTable = ({ items, onChange, readOnly }: SangriasTableProps) => {
  const isMobile = useIsMobile();

  const updateItem = (id: string, field: keyof SangriaItem, value: string) => {
    onChange(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addRow = () => onChange([...items, emptySangria()]);
  const removeRow = (id: string) => onChange(items.filter((item) => item.id !== id));

  const fields: { key: keyof SangriaItem; label: string; placeholder: string }[] = [
    { key: "sangria", label: "Sangria", placeholder: "Ex: R$ 150,00" },
    { key: "cartelasVazias", label: "Cartelas Vazias", placeholder: "Ex: 20 unidades" },
    { key: "barbantes", label: "Barbantes", placeholder: "Ex: 5 rolos" },
    { key: "notacoes", label: "Notações", placeholder: "Ex: Reposição pendente" },
  ];

  if (isMobile) {
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Registro</span>
              {!readOnly && (
                <button
                  onClick={() => removeRow(item.id)}
                  className="p-2 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {fields.map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{field.label}</label>
                <Input
                  value={item[field.key]}
                  onChange={(e) => updateItem(item.id, field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="h-10 text-sm"
                  readOnly={readOnly}
                />
              </div>
            ))}
          </div>
        ))}
        {!readOnly && (
          <Button variant="outline" size="lg" onClick={addRow} className="gap-1.5 w-full h-12">
            <Plus className="w-4 h-4" /> Adicionar Linha
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary/10 text-foreground">
              <th className="px-3 py-3 text-left font-bold text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Sangria</th>
              <th className="px-3 py-3 text-left font-bold text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Cartelas Vazias</th>
              <th className="px-3 py-3 text-left font-bold text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Barbantes</th>
              <th className="px-3 py-3 text-left font-bold text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Campo de Notações</th>
              {!readOnly && <th className="px-3 py-3 w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className={`border-t border-border/50 transition-colors duration-200 hover:bg-muted/30 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                {fields.map((field) => (
                  <td key={field.key} className="px-2 py-1.5">
                    <Input
                      value={item[field.key]}
                      onChange={(e) => updateItem(item.id, field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="border border-input bg-background h-8 text-sm rounded-md"
                      readOnly={readOnly}
                    />
                  </td>
                ))}
                {!readOnly && (
                  <td className="px-2 py-1.5">
                    <button onClick={() => removeRow(item.id)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div className="p-3 border-t border-border/50">
          <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Adicionar Linha
          </Button>
        </div>
      )}
    </div>
  );
};

export default SangriasTable;
