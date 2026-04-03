const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { app_key, app_secret, pagina = 1, data_inicio, data_fim } = await req.json();

    if (!app_key || !app_secret) {
      return new Response(JSON.stringify({ error: "app_key e app_secret são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params: Record<string, unknown> = {
      nPagina: pagina,
      nRegPorPagina: 100,
    };
    if (data_inicio) params.dDataInicial = data_inicio;
    if (data_fim) params.dDataFinal = data_fim;

    const omieResponse = await fetch("https://app.omie.com.br/api/v1/estoque/ajuste/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        call: "ListarAjusteEstoque",
        app_key,
        app_secret,
        param: [params],
      }),
    });

    const omieData = await omieResponse.text();
    let parsed: unknown;
    try { parsed = JSON.parse(omieData); } catch { parsed = { raw: omieData }; }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
