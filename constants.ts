
import { AOSRow } from './types';

export const ANALYTIC_COLUMNS: (keyof AOSRow)[] = [
  "start_date",
  "ac",
  "tempo_aos",
  "order_ps",
  "base",
  "partnumber",
  "analise_mtl",
  "tempo_material",
  "range",
  "hora_req",
  "hora_pouso",
  "hora_rec",
  "prioridade",
  "observacao",
  "mtl_utilizado"
];

export const COLUMN_DISPLAY_NAMES: Record<keyof AOSRow, string> = {
  start_date: "DATA",
  ac: "ACFT",
  tempo_aos: "TEMPO AOS",
  order_ps: "TRANSFER/PS",
  base: "BASE",
  partnumber: "PART NUMBER",
  analise_mtl: "INF.",
  tempo_material: "TEMPO LOG MTL",
  range: "RANGE",
  hora_req: "REQUISIÇÃO",
  hora_pouso: "PREV. DE POUSO.",
  hora_rec: "RECEBIMENTO",
  prioridade: "PRIORIDADE",
  observacao: "OBSERVAÇÃO",
  mtl_utilizado: "MTL UTILIZADO"
};

export const TEMPO_ORDER = [
  "Entre 0h e 01h",
  "Entre 1h e 06h",
  "Entre 6h e 12h",
  "Entre 12h e 13h",
  "Entre 13h e 14h",
  "Entre 14h e 15h",
  "Entre 15h e 16h",
  "Entre 16h e 24h",
  "Entre 24h e 48h",
  "Acima de 48h",
  "SEM INFORMAÇÃO"
];

export const CHART_COLORS = [
  '#2276d0', '#ff8a42', '#6a3d9a', '#27ae60', '#e74c3c', 
  '#f39c12', '#8e44ad', '#16a085', '#d35400', '#c0392b', 
  '#2980b9', '#7f8c8d', '#34495e', '#9b59b6', '#3498db', 
  '#e67e22', '#95a5a6', '#1abc9c', '#f1c40f', '#e91e63'
];
