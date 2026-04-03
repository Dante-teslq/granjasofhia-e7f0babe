import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONTAS = [
  { nome: "Filial Granja Sofhia", app_key: "6542435457558", app_secret: "8aafaebdc473934bf8cd2a1e72b92659" },
  { nome: "Ceasa Timon", app_key: "5350975315686", app_secret: "e429894ba0a73c6151b3130f81ac2f52" },
  { nome: "Parque Alvorada", app_key: "6007471325856", app_secret: "9aee0baeef6d1d3200d71fc0818a14e9" },
  { nome: "São Benedito", app_key: "5350913982414", app_secret: "468f3bcad872b8d46e95c1e3402e96b5" },
  { nome: "Formosa", app_key: "5350990649004", app_secret: "f94d58117e9b93caef220989097c0288" },
];

function getAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function fetchAllProducts(app_key: string, app_secret: string) {
  const allProducts: any[] = [];
  let pagina = 1;
  let totalPaginas = 1;

  while (pagina <= totalPaginas) {
    const res = await fetch("https://app.omie.com.br/api/v1/geral/produtos/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        call: "ListarProdutos",
        app_key,
        app_secret,
        param: [{ pagina, registros_por_pagina: 500, apenas_importado_api: "N" }],
      }),
    });

    const data = await res.json();
    if (data.faultstring) {
      console.error(`Omie error: ${data.faultstring}`);
      break;
    }

    totalPaginas = data.total_de_paginas || 1;
    const produtos = data.produto_servico_cadastro || [];
    allProducts.push(...produtos);
    pagina++;
  }

  return allProducts;
}

async function fetchEstoque(app_key: string, app_secret: string) {
  const allEstoque: any[] = [];
  let pagina = 1;
  let totalPaginas = 1;

  while (pagina <= totalPaginas) {
    const res = await fetch("https://app.omie.com.br/api/v1/estoque/consulta/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        call: "ListarPosEstoque",
        app_key,
        app_secret,
        param: [{ nPagina: pagina, nRegPorPagina: 500 }],
      }),
    });

    const data = await res.json();
    if (data.faultstring) {
      console.error(`Omie estoque error: ${data.faultstring}`);
      break;
    }

    totalPaginas = data.nTotPaginas || 1;
    const items = data.produtos || [];
    allEstoque.push(...items);
    pagina++;
  }

  return allEstoque;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = getAdminClient();
    const results: any[] = [];

    // Get PDV IDs from pontos_de_venda
    const { data: pdvs } = await admin.from("pontos_de_venda").select("id, nome");
    const pdvMap = new Map((pdvs || []).map((p: any) => [p.nome, p.id]));

    // Map conta names to PDV names (best effort)
    const contaPdvMap: Record<string, string> = {
      "Filial Granja Sofhia": "Depósito Sofhia",
      "Ceasa Timon": "CEASA",
      "Parque Alvorada": "Parque Alvorada",
      "São Benedito": "São Benedito",
      "Formosa": "Formosa",
    };

    for (const conta of CONTAS) {
      console.log(`Syncing: ${conta.nome}`);
      const contaResult: any = { pdv: conta.nome, produtos: 0, estoque: 0, errors: [] };

      try {
        // 1. Fetch and upsert products
        const produtos = await fetchAllProducts(conta.app_key, conta.app_secret);
        contaResult.produtos = produtos.length;

        for (const p of produtos) {
          const { error } = await admin.from("produtos").upsert({
            codigo_omie: p.codigo_produto,
            nome: p.descricao || p.descricao_familia || "",
            preco: p.valor_unitario || 0,
            estoque: p.quantidade_estoque || 0,
          }, { onConflict: "codigo_omie" });

          if (error) contaResult.errors.push(`Produto ${p.codigo_produto}: ${error.message}`);
        }

        // 2. Fetch and upsert estoque_pdv
        const pdvNome = contaPdvMap[conta.nome] || conta.nome;
        const pdvId = pdvMap.get(pdvNome);

        if (pdvId) {
          const estoque = await fetchEstoque(conta.app_key, conta.app_secret);
          contaResult.estoque = estoque.length;

          for (const item of estoque) {
            const codigo = String(item.nCodProd || item.codigo_produto || "");
            const descricao = item.cDescrProd || item.descricao || "";
            const quantidade = item.nSaldo || item.saldo || 0;

            const { error } = await admin.from("estoque_pdv").upsert({
              pdv_id: pdvId,
              produto_codigo: codigo,
              produto_descricao: descricao,
              quantidade,
            }, { onConflict: "pdv_id,produto_codigo" });

            if (error) contaResult.errors.push(`Estoque ${codigo}: ${error.message}`);
          }
        } else {
          contaResult.errors.push(`PDV "${pdvNome}" não encontrado na tabela pontos_de_venda`);
        }
      } catch (e: any) {
        contaResult.errors.push(e.message);
      }

      results.push(contaResult);
    }

    return new Response(JSON.stringify({ success: true, results }), {
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
