import { useCallback } from "react";
import { useFraud } from "@/contexts/FraudContext";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";

interface AjusteItem {
  descricao: string;
  estoque_sistema: number;
  estoque_loja: number;
}

/**
 * Provides automatic fraud detection checks to be called after successful CRUD operations.
 * Wraps addAlert + updateRiskProfile from FraudContext with the detection logic.
 */
export function useFraudDetection() {
  const { addAlert, updateRiskProfile, fraudSettings } = useFraud();
  const { settings, profile } = useApp();

  const operatorName = profile?.nome || profile?.email || "Sistema";

  /** Fires a fora_horario alert if the current time is outside configured operation hours. */
  const checkForaHorario = useCallback(async (module: string, link: string): Promise<boolean> => {
    const h = new Date().getHours();
    if (h >= settings.operationStartHour && h < settings.operationEndHour) return false;

    await addAlert({
      type: "fora_horario",
      severity: "média",
      status: "ativo",
      message: `Operação em ${module} registrada fora do horário (${settings.operationStartHour}h–${settings.operationEndHour}h) às ${h}h`,
      operator: operatorName,
      link,
      details: { module, hora: h, inicio: settings.operationStartHour, fim: settings.operationEndHour },
    });
    await updateRiskProfile(operatorName, { afterHoursOps: 1 });
    return true;
  }, [addAlert, updateRiskProfile, settings, operatorName]);

  /**
   * Fires ajuste_elevado for each item whose discrepancy (sistema vs loja) exceeds the threshold.
   * Calls updateRiskProfile once with the aggregate counts.
   */
  const checkAjusteElevado = useCallback(async (items: AjusteItem[], link: string): Promise<boolean> => {
    const validItems = items.filter(i => i.estoque_sistema > 0);
    let highCount = 0;

    for (const item of validItems) {
      const variacao = Math.abs(item.estoque_sistema - item.estoque_loja) / item.estoque_sistema * 100;
      if (variacao > fraudSettings.adjustmentThresholdPercent) {
        highCount++;
        await addAlert({
          type: "ajuste_elevado",
          severity: "crítica",
          status: "ativo",
          message: `Ajuste elevado em "${item.descricao}": variação de ${variacao.toFixed(1)}% (sistema: ${item.estoque_sistema}, loja: ${item.estoque_loja})`,
          operator: operatorName,
          link,
          details: {
            produto: item.descricao,
            estoque_sistema: item.estoque_sistema,
            estoque_loja: item.estoque_loja,
            variacao_pct: Number(variacao.toFixed(1)),
            threshold: fraudSettings.adjustmentThresholdPercent,
          },
        });
      }
    }

    await updateRiskProfile(operatorName, {
      totalAdjustments: validItems.length,
      highAdjustments: highCount,
    });

    return highCount > 0;
  }, [addAlert, updateRiskProfile, fraudSettings, operatorName]);

  /**
   * Fires multiplas_alteracoes if this operator has exceeded maxAdjustmentsPerHour
   * ajuste_elevado alerts in the last hour.
   */
  const checkMultiplosAjustes = useCallback(async (link: string): Promise<boolean> => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("fraud_alerts")
      .select("*", { count: "exact", head: true })
      .eq("operator", operatorName)
      .eq("type", "ajuste_elevado")
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) >= fraudSettings.maxAdjustmentsPerHour) {
      await addAlert({
        type: "multiplas_alteracoes",
        severity: "média",
        status: "ativo",
        message: `Operador "${operatorName}" ultrapassou ${fraudSettings.maxAdjustmentsPerHour} ajustes elevados na última hora (${count} detectados)`,
        operator: operatorName,
        link,
        details: { ajustes_1h: count, limite: fraudSettings.maxAdjustmentsPerHour },
      });
      await updateRiskProfile(operatorName, { multiEditCount: 1 });
      return true;
    }
    return false;
  }, [addAlert, updateRiskProfile, fraudSettings, operatorName]);

  return { checkForaHorario, checkAjusteElevado, checkMultiplosAjustes };
}
