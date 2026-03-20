import { TransferenciaRecord } from "@/hooks/useTransferencias";

interface Props {
  records: TransferenciaRecord[];
}

const TransferenciaStats = ({ records }: Props) => {
  const pendentes = records.filter((r) => r.status === "pendente").length;
  const confirmados = records.filter((r) => r.status === "confirmado").length;
  const totalCartelas = records.reduce((sum, r) => sum + r.quantidade, 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-6">
      <div className="glass-card p-4 md:p-6">
        <p className="text-[10px] md:text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Total no Período</p>
        <p className="text-xl md:text-3xl font-extrabold tracking-tight text-foreground">{records.length}</p>
      </div>
      <div className="glass-card p-4 md:p-6">
        <p className="text-[10px] md:text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Cartelas Enviadas</p>
        <p className="text-xl md:text-3xl font-extrabold tracking-tight text-foreground">{totalCartelas}</p>
      </div>
      <div className="glass-card p-4 md:p-6">
        <p className="text-[10px] md:text-[11px] font-bold text-warning uppercase tracking-wider mb-2 text-[10px] md:text-[11px] font-bold">Pendentes</p>
        <p className="text-xl md:text-3xl font-extrabold tracking-tight text-warning">{pendentes}</p>
      </div>
      <div className="glass-card p-4 md:p-6">
        <p className="text-[10px] md:text-[11px] font-bold text-emerald-500 uppercase tracking-wider mb-2">Confirmados</p>
        <p className="text-xl md:text-3xl font-extrabold tracking-tight text-emerald-500">{confirmados}</p>
      </div>
    </div>
  );
};

export default TransferenciaStats;
