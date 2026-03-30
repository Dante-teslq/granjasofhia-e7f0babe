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
  bobinas: string;
  caixasAlmeida: string;
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
  { descricao: "OVOS P/ PRODUÇÃO", codigo: "64", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS VERMELHO GRANDE 15 UN O VIZIN", codigo: "65", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS BRANCO GRANDE ALMEIDA 30 UN", codigo: "001", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS BRANCO ALMEIDA 30 UN", codigo: "002", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS BRANCO EXTRA ALMEIDA 30 UN", codigo: "003", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS VERMELHO GRANDE ALMEIDA 30 UN", codigo: "004", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS CAIPIRA 15 UN", codigo: "42", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS BRANCO GRANDE 30 UN O VIZIN", codigo: "57", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS BRANCO GRANDE 15 UN O VIZIN", codigo: "62", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS MÉDIO VERMELHO", codigo: "20", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS BRANCO MÉDIO PROMOCIONAL 30 UN", codigo: "72", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS DE CODORNA 30 UN", codigo: "005", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS GRANDE BRANCO SOFHIA 30 UN", codigo: "10", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS JUMBO BRANCO SOFHIA 30 UN", codigo: "11", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS MÉDIO BRANCO SOFHIA 30 UN", codigo: "009", categoria: "OVOS", unidade_medida: "CARTELA" },
  { descricao: "OVOS SEM CLASSIFICAÇÃO BRANCO SOFHIA 30 UN", codigo: "008", categoria: "OVOS", unidade_medida: "CARTELA" },
] as const;
