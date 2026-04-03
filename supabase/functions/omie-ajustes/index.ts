import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: isAdmin } = await admin.rpc("is_admin_user", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { omie_conta_id, pagina = 1, data_inicio, data_fim } = body;

    if (!omie_conta_id) {
      return new Response(JSON.stringify({ error: "omie_conta_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get credentials from omie_contas
    const { data: conta, error: contaError } = await admin
      .from("omie_contas")
      .select("omie_app_key, omie_app_secret, pdv_nome")
      .eq("id", omie_conta_id)
      .single();

    if (contaError || !conta) {
      return new Response(JSON.stringify({ error: "Conta Omie não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appKey = conta.omie_app_key;
    const appSecret = conta.omie_app_secret;

    if (!appKey || !appSecret) {
      return new Response(JSON.stringify({ error: "Credenciais incompletas na conta Omie" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build params
    const params: Record<string, unknown> = {
      nPagina: pagina,
      nRegPorPagina: 100,
    };

    if (data_inicio) params.dDataInicial = data_inicio;
    if (data_fim) params.dDataFinal = data_fim;

    // Call Omie API
    const omieResponse = await fetch("https://app.omie.com.br/api/v1/estoque/ajuste/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        call: "ListarAjusteEstoque",
        app_key: appKey,
        app_secret: appSecret,
        param: [params],
      }),
    });

    const omieData = await omieResponse.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(omieData);
    } catch {
      parsed = { raw: omieData };
    }

    return new Response(JSON.stringify({
      success: true,
      pdv_nome: conta.pdv_nome,
      data: parsed,
    }), {
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
