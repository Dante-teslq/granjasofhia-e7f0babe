export interface StockItem {
  id: string;
  descricao: string;
  codigo: string;
  estoqueSistema: number;
  estoqueLoja: number;
  trincado: number;
  quebrado: number;
  faltas: number;
  obs: string;
}

export interface SangriaItem {
  id: string;
  sangria: string; // kept for DB compat, unused in UI
  cartelasVazias: string;
  barbantes: string;
  notacoes: string;
  pontoVenda: string;
  data?: string;
  usuario?: string;
  createdAt?: string;
}

// Faltas: apenas diferença entre loja e sistema (quebras e trincados não entram)
export function calcularFaltas(item: StockItem): number {
  return item.estoqueLoja - item.estoqueSistema;
}

// Estoque final: não subtrai trincados (reclassificação)
export function calcularEstoqueFinal(item: StockItem): number {
  return item.estoqueSistema - item.estoqueLoja - item.quebrado;
}

export const STORES = [
  "CEASA",
  "Depósito Sofhia",
  "Depósito Timon",
  "Formosa",
  "Frente de Loja",
  "Parque Alvorada",
  "Rota Externo",
  "Rota Timon",
  "São Benedito",
] as const;

export type StoreName = (typeof STORES)[number];

export const PRODUCT_CATALOG = [
  { descricao: "OVOS P/ PRODUÇÃO", codigo: "100", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS VERMELHO GRANDE 15 UN O VIZIN", codigo: "101", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS BRANCO GRANDE ALMEIDA 30 UN", codigo: "102", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS BRANCO ALMEIDA 30 UN", codigo: "103", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS BRANCO EXTRA ALMEIDA 30 UN", codigo: "104", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS VERMELHO GRANDE ALMEIDA 30 UN", codigo: "105", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS CAIPIRA 15 UN", codigo: "106", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS BRANCO GRANDE 30 UN O VIZIN", codigo: "107", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS BRANCO GRANDE 15 UN O VIZIN", codigo: "108", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS MÉDIO VERMELHO", codigo: "109", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS BRANCO MÉDIO PROMOCIONAL 30 UN", codigo: "110", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS DE CODORNA 30 UN", codigo: "111", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS GRANDE BRANCO SOFHIA 30 UN", codigo: "112", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS JUMBO BRANCO SOFHIA 30 UN", codigo: "113", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS MÉDIO BRANCO SOFHIA 30 UN", codigo: "114", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS SEM CLASSIFICAÇÃO BRANCO SOFHIA 30 UN", codigo: "115", categoria: "OVOS", unidade_medida: "CARTELA" },
] as const;
