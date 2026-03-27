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
  { descricao: "GRANDE ALMEIDA", codigo: "1", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "MEDIO ALMEIDA", codigo: "2", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "EXTRA ALMEIDA", codigo: "3", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "VERMELHO ALMEIDA", codigo: "4", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "CODORNA", codigo: "5", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "MEDIO SOFHIA", codigo: "9", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "GRANDE SOFHIA", codigo: "10", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS JUMBO SOFHIA", codigo: "11", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "VERMELHO PEQUENO ALMEIDA", codigo: "20", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "CAIPIRA ESTANCIA GAUCHA", codigo: "42", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "GRANDE CANÃA", codigo: "51", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "EXTRA GRANDE CANÃA", codigo: "53", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "GRANDE C/30 VIZIN", codigo: "57", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "GRANDE C/15 VIZIN", codigo: "62", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "VERMELHO C/30 VIZIN", codigo: "63", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "VERMELHO C/ 15", codigo: "65", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "MEDIO PROMOCIONAL", codigo: "72", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "PLENO GRANDE", codigo: "81", categoria: "OVOS", unidade_medida: "CARTELA" },
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
