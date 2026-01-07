
export interface AOSRow {
  id?: number; // Adicionado para referência no Supabase
  start_date: string;
  ac: string;
  tempo_aos: string;
  order_ps: string;
  base: string;
  partnumber: string;
  analise_mtl: string;
  tempo_material: string;
  range: string;
  hora_req: string;
  hora_pouso: string;
  hora_rec: string;
  prioridade: string;
  observacao: string;
  mtl_utilizado: string;
}

export type ChartView = 'base' | 'tipo' | 'tempo' | 'distribuicao' | 'acft' | 'partnumber';

export interface SortState {
  col: keyof AOSRow;
  dir: 1 | -1;
}

export interface ColumnPreference {
  id: keyof AOSRow;
  displayName: string;
  width?: number;
}
