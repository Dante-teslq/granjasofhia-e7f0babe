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
  sangria: string;
  cartelasVazias: string;
  barbantes: string;
  notacoes: string;
  pontoVenda: string;
}

export interface PontoDeVenda {
  id: string;
  nome: string;
  tipo: 'rota' | 'deposito' | 'loja';
  permite_venda: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EstoquePdv {
  id: string;
  produto_codigo: string;
  produto_descricao: string;
  pdv_id: string;
  quantidade: number;
  quantidade_minima: number;
  created_at: string;
  updated_at: string;
}

export interface MovimentacaoEstoque {
  id: string;
  produto_codigo: string;
  produto_descricao: string;
  quantidade: number;
  tipo: 'entrada' | 'saida' | 'transferencia' | 'ajuste' | 'venda';
  pdv_origem_id: string | null;
  pdv_destino_id: string | null;
  usuario: string | null;
  observacao: string;
  created_at: string;
}

// Faltas: apenas diferença entre loja e sistema (quebras e trincados não entram)
export function calcularFaltas(item: StockItem): number {
  return item.estoqueLoja - item.estoqueSistema;
}

// Estoque final: não subtrai trincados (reclassificação)
export function calcularEstoqueFinal(item: StockItem): number {
  return item.estoqueSistema - item.estoqueLoja - item.quebrado;
}

// Keep old STORES for backward compat
export const STORES = [
  "CEASA",
  "Formosa",
  "Parque Alvorada",
  "São Benedito",
  "Frente de Loja",
] as const;

export type StoreName = (typeof STORES)[number];

export const PRODUCT_CATALOG = [
  { descricao: "GRANDE ALMEIDA", codigo: "1" },
  { descricao: "MEDIO ALMEIDA", codigo: "2" },
  { descricao: "EXTRA ALMEIDA", codigo: "3" },
  { descricao: "VERMELHO ALMEIDA", codigo: "4" },
  { descricao: "CODORNA", codigo: "5" },
  { descricao: "MEDIO SOFHIA", codigo: "9" },
  { descricao: "GRANDE SOFHIA", codigo: "10" },
  { descricao: "OVOS JUMBO SOFHIA", codigo: "11" },
  { descricao: "VERMELHO PEQUENO ALMEIDA", codigo: "20" },
  { descricao: "CAIPIRA ESTANCIA GAUCHA", codigo: "42" },
  { descricao: "GRANDE CANÃA", codigo: "51" },
  { descricao: "EXTRA GRANDE CANÃA", codigo: "53" },
  { descricao: "GRANDE C/30 VIZIN", codigo: "57" },
  { descricao: "GRANDE C/15 VIZIN", codigo: "62" },
  { descricao: "VERMELHO C/30 VIZIN", codigo: "63" },
  { descricao: "VERMELHO C/ 15", codigo: "65" },
  { descricao: "MEDIO PROMOCIONAL", codigo: "72" },
  { descricao: "PLENO GRANDE", codigo: "81" },
] as const;
