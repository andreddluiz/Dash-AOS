
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
  // Added id property to satisfy the Record<keyof AOSRow, string> type requirement
  id: "ID",
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
  "0 e 1h",
  "1 e 6h",
  "6 e 12h",
  "12 e 24h",
  "24 e 48h",
  "acima de 48h"
];

export const CHART_COLORS = [
  '#2276d0', '#ff8a42', '#6a3d9a', '#27ae60', '#e74c3c', 
  '#f39c12', '#8e44ad', '#16a085', '#d35400', '#c0392b', 
  '#2980b9', '#7f8c8d', '#34495e', '#9b59b6', '#3498db', 
  '#e67e22', '#95a5a6', '#1abc9c', '#f1c40f', '#e91e63'
];
