import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all active integrations with their PDV info
    const { data: integrations, error: intError } = await supabase
      .from("omie_integrations")
      .select("id, omie_app_key, omie_app_secret, pdv_id, integration_name")
      .eq("is_active", true);

    if (intError) throw intError;
    if (!integrations || integrations.length === 0) {
      return new Response(
        JSON.stringify({ total_sincronizados: 0, por_pdv: {}, message: "Nenhuma integração ativa" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get PDV names
    const pdvIds = integrations.map((i: any) => i.pdv_id).filter(Boolean);
    const { data: pdvs } = await supabase
      .from("pontos_de_venda")
      .select("id, nome")
      .in("id", pdvIds);

    const pdvMap: Record<string, string> = {};
    (pdvs || []).forEach((p: any) => { pdvMap[p.id] = p.nome; });

    // Ensure omie_contas exist for each integration
    for (const integ of integrations) {
      if (!integ.pdv_id) continue;
      const pdvNome = pdvMap[integ.pdv_id] || integ.integration_name;
      
      await supabase.from("omie_contas").upsert(
        {
          omie_app_key: integ.omie_app_key,
          pdv_nome: pdvNome,
          descricao: integ.integration_name,
        },
        { onConflict: "omie_app_key" }
      );
    }

    let totalSincronizados = 0;
    const porPdv: Record<string, number> = {};

    for (const integ of integrations) {
      if (!integ.pdv_id) continue;
      const pdvNome = pdvMap[integ.pdv_id] || integ.integration_name;

      // Call Omie API for stock positions
      const omieResponse = await fetch(
        "https://app.omie.com.br/api/v1/estoque/ajuste/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            call: "ListarPosEstoque",
            app_key: integ.omie_app_key,
            app_secret: integ.omie_app_secret,
            param: [{ nPagina: 1, nRegPorPagina: 500, dDataPosicao: new Date().toISOString().split("T")[0] }],
          }),
        }
      );

      if (!omieResponse.ok) {
        console.error(`Omie API error for ${pdvNome}: ${omieResponse.status}`);
        continue;
      }

      const omieData = await omieResponse.json();
      const produtos = omieData?.produtos || [];

      // Get omie_conta_id
      const { data: contaData } = await supabase
        .from("omie_contas")
        .select("id")
        .eq("omie_app_key", integ.omie_app_key)
        .single();

      if (!contaData) continue;

      // Get internal stock for this PDV
      const { data: estoqueInterno } = await supabase
        .from("estoque_pdv")
        .select("produto_codigo, quantidade")
        .eq("pdv_id", integ.pdv_id);

      const estoqueMap: Record<string, number> = {};
      (estoqueInterno || []).forEach((e: any) => {
        estoqueMap[e.produto_codigo] = e.quantidade;
      });

      let count = 0;
      for (const prod of produtos) {
        const codigo = String(prod.nCodProd || prod.codigo || "");
        const descricao = prod.cDescrProd || prod.descricao || "";
        const saldoOmie = prod.nSaldo || prod.saldo || 0;
        const saldoInterno = estoqueMap[codigo] ?? 0;
        const divergencia = saldoInterno - saldoOmie;

        await supabase.from("omie_reconciliacao").upsert(
          {
            omie_conta_id: contaData.id,
            data: new Date().toISOString().split("T")[0],
            produto_codigo: codigo,
            produto_descricao: descricao,
            saldo_interno: saldoInterno,
            saldo_omie: saldoOmie,
            divergencia,
            status: "pendente",
          },
          { onConflict: "omie_conta_id,data,produto_codigo", ignoreDuplicates: false }
        );
        count++;
      }

      totalSincronizados += count;
      porPdv[pdvNome] = count;
    }

    return new Response(
      JSON.stringify({ total_sincronizados: totalSincronizados, por_pdv: porPdv }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("omie-sync-ajustes error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
