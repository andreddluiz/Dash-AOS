
import * as XLSX from 'xlsx';
import { AOSRow } from '../types';
import { ANALYTIC_COLUMNS, COLUMN_DISPLAY_NAMES } from '../constants';

const formatExcelValue = (val: any, colName: keyof AOSRow): string => {
  if (val === null || val === undefined || val === '') return '';

  const timeColumns: (keyof AOSRow)[] = ['hora_req', 'hora_pouso', 'hora_rec', 'tempo_aos', 'tempo_material'];
  const pad = (n: number) => n.toString().padStart(2, '0');

  // Handle Excel numeric dates/times
  if (typeof val === 'number') {
    try {
      const date = XLSX.SSF.parse_date_code(val);
      
      if (colName === 'start_date') {
        return `${pad(date.d)}/${pad(date.m)}/${date.y}`;
      }
      
      if (timeColumns.includes(colName)) {
        return `${pad(date.H)}:${pad(date.M)}:${pad(date.S)}`;
      }
    } catch (e) {
      return String(val);
    }
  }

  // Handle strings (ensure HH:MM becomes HH:MM:SS)
  if (typeof val === 'string') {
    if (timeColumns.includes(colName)) {
      const parts = val.trim().split(':');
      if (parts.length === 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
      }
      if (parts.length === 3) {
        return parts.map(p => p.padStart(2, '0')).join(':');
      }
    }
  }

  return String(val);
};

export const processExcelFile = (file: File): Promise<AOSRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
          resolve([]);
          return;
        }

        // Detect and skip header row
        const firstRow = jsonData[0];
        const isHeader = firstRow.some((cell: any) => 
          typeof cell === 'string' && 
          Object.values(COLUMN_DISPLAY_NAMES).some(header => 
            cell.toUpperCase().includes(header.toUpperCase())
          )
        );

        const rows = isHeader ? jsonData.slice(1) : jsonData;

        // Map to AOSRow interface with formatting
        const processedRows: AOSRow[] = rows
          .filter(row => row.length > 0 && row.some((cell: any) => cell !== null && cell !== ''))
          .map(row => {
            const obj: any = {};
            ANALYTIC_COLUMNS.forEach((col, idx) => {
              obj[col] = formatExcelValue(row[idx], col);
            });
            return obj as AOSRow;
          });

        resolve(processedRows);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
    reader.readAsArrayBuffer(file);
  });
};
