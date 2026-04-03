import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Package } from "lucide-react";
import { useOmieSyncAjustes } from "@/hooks/useOmieSyncAjustes";

export default function OmieMovimentosCard() {
  const { sincronizar, loading, resultado } = useOmieSyncAjustes();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          Movimentos de Estoque Omie
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Sincroniza posições de estoque do Omie e compara com o saldo interno, gerando registros de reconciliação.
        </p>
        <Button
          size="sm"
          onClick={() => sincronizar()}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Sincronizando..." : "Sincronizar Agora"}
        </Button>

        {resultado && (
          <div className="mt-3 space-y-1">
            <p className="text-sm font-medium text-foreground">
              {resultado.total_sincronizados} registros sincronizados
            </p>
            {Object.entries(resultado.por_pdv).map(([pdv, count]) => (
              <div key={pdv} className="flex justify-between text-xs text-muted-foreground">
                <span>{pdv}</span>
                <span className="font-medium text-foreground">{count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
