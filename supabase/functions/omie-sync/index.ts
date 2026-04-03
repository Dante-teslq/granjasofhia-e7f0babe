import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const appKey = Deno.env.get("OMIE_APP_KEY");
    const appSecret = Deno.env.get("OMIE_APP_SECRET");
    if (!appKey || !appSecret) {
      return new Response(
        JSON.stringify({ error: "OMIE_APP_KEY ou OMIE_APP_SECRET não configurados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Omie API
    const omieRes = await fetch("https://app.omie.com.br/api/v1/geral/produtos/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        call: "ListarProdutos",
        app_key: appKey,
        app_secret: appSecret,
        param: [{ pagina: 1, registros_por_pagina: 500 }],
      }),
    });

    if (!omieRes.ok) {
      const txt = await omieRes.text();
      return new Response(
        JSON.stringify({ error: "Erro na API Omie", status: omieRes.status, detail: txt }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const omieData = await omieRes.json();

    if (omieData.faultstring) {
      return new Response(
        JSON.stringify({ error: omieData.faultstring }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const produtos = omieData.produto_servico_cadastro || [];

    // Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let upserted = 0;
    let errors: string[] = [];

    for (const p of produtos) {
      const { error } = await supabase.from("produtos").upsert(
        {
          codigo_omie: p.codigo_produto,
          nome: p.descricao || "",
          preco: p.valor_unitario || 0,
          estoque: p.quantidade_estoque || 0,
        },
        { onConflict: "codigo_omie" }
      );
      if (error) {
        errors.push(`${p.codigo_produto}: ${error.message}`);
      } else {
        upserted++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_omie: produtos.length,
        upserted,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
