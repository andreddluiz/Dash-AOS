
import React, { useState, useMemo, useRef } from 'react';
import { 
  ArrowUpDown, Search, Download, ChevronLeft, ChevronRight, GripVertical, Filter, Trash2 
} from 'lucide-react';
import { AOSRow, SortState } from '../types';
import { ANALYTIC_COLUMNS, COLUMN_DISPLAY_NAMES } from '../constants';
import { exportToExcel, exportToPdf } from '../services/exportService';

interface AnalyticTableProps {
  data: AOSRow[];
  fullData: AOSRow[];
  isAdmin?: boolean;
  onDelete?: (id: number) => void;
}

const AnalyticTable: React.FC<AnalyticTableProps> = ({ data, fullData, isAdmin, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState<SortState>({ col: 'start_date', dir: 1 });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>(10);
  const [filterColumn, setFilterColumn] = useState<keyof AOSRow | ''>('');
  const [filterValue, setFilterValue] = useState('');
  const [columnOrder, setColumnOrder] = useState<(keyof AOSRow)[]>(ANALYTIC_COLUMNS);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    ANALYTIC_COLUMNS.reduce((acc, col) => ({ ...acc, [col]: 150 }), {})
  );

  const dragColumn = useRef<number | null>(null);
  const dragOverColumn = useRef<number | null>(null);
  const resizingCol = useRef<{ col: keyof AOSRow; startX: number; startWidth: number } | null>(null);

  const filteredData = useMemo(() => {
    let result = [...data];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(row => columnOrder.some(col => String(row[col] || '').toLowerCase().includes(q)));
    }
    if (filterColumn && filterValue) {
      const q = filterValue.toLowerCase();
      result = result.filter(row => String(row[filterColumn] || '').toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      const valA = String(a[sort.col] || '').toLowerCase();
      const valB = String(b[sort.col] || '').toLowerCase();
      return valA < valB ? -1 * sort.dir : valA > valB ? 1 * sort.dir : 0;
    });
    return result;
  }, [data, searchTerm, sort, filterColumn, filterValue, columnOrder]);

  const effectiveRowsPerPage = rowsPerPage === 'all' ? filteredData.length : rowsPerPage;
  const totalPages = rowsPerPage === 'all' ? 1 : Math.ceil(filteredData.length / rowsPerPage);
  const pagedData = rowsPerPage === 'all' ? filteredData : filteredData.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleResizeStart = (e: React.MouseEvent, col: keyof AOSRow) => {
    e.stopPropagation(); e.preventDefault();
    resizingCol.current = { col, startX: e.pageX, startWidth: columnWidths[col] || 150 };
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (resizingCol.current) {
        const delta = moveEvent.pageX - resizingCol.current.startX;
        const newWidth = Math.max(80, resizingCol.current.startWidth + delta);
        setColumnWidths(prev => ({ ...prev, [resizingCol.current!.col]: newWidth }));
      }
    };
    const onMouseUp = () => { resizingCol.current = null; document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
    document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="space-y-0 flex flex-col max-w-full bg-white animate-in fade-in duration-500">
      <div className="p-6 border-b border-slate-100 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Busca global..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => exportToExcel(filteredData, 'visao_filtrada.xlsx')} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors">Exportar Filtrado</button>
            <button onClick={() => exportToPdf(fullData, 'Dados Completos')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm transition-colors">Exportar PDF Full</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <Filter size={14} className="text-slate-400" />
          <select className="text-xs border rounded-lg px-2 py-1.5 bg-white font-medium" value={filterColumn} onChange={e => setFilterColumn(e.target.value as keyof AOSRow)}>
            <option value="">Filtrar por Coluna</option>
            {ANALYTIC_COLUMNS.map(col => <option key={col} value={col}>{COLUMN_DISPLAY_NAMES[col]}</option>)}
          </select>
          <input type="text" placeholder="Valor..." className="text-xs border rounded-lg px-3 py-1.5 bg-white flex-1 max-w-xs outline-none focus:ring-2 focus:ring-blue-100" value={filterValue} onChange={e => setFilterValue(e.target.value)} />
        </div>
      </div>

      <div className="w-full overflow-x-auto border-b border-slate-200 relative scrollbar-hide">
        <table className="w-full border-collapse text-left table-fixed">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              {isAdmin && <th className="px-4 py-4 w-12 border-b border-slate-100"></th>}
              {columnOrder.map((col, idx) => (
                <th key={col} className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 select-none relative group/header" style={{ width: columnWidths[col] || 150 }}>
                  <div className="flex items-center gap-2">
                    <span className="truncate flex-1 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setSort({ col, dir: sort.col === col ? (sort.dir * -1 as 1 | -1) : 1 })}>{COLUMN_DISPLAY_NAMES[col]}</span>
                    <ArrowUpDown size={10} className={sort.col === col ? 'text-blue-500' : 'text-slate-300'} />
                  </div>
                  <div onMouseDown={(e) => handleResizeStart(e, col)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group-hover/header:bg-blue-300 z-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 bg-white">
            {pagedData.map((row, idx) => (
              <tr key={row.id || idx} className="hover:bg-blue-50/20 group transition-colors">
                {isAdmin && (
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => row.id && onDelete?.(row.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                  </td>
                )}
                {columnOrder.map(col => (
                  <td key={col} className="px-4 py-3 text-[13px] text-slate-600 truncate border-r border-slate-50 last:border-r-0" style={{ width: columnWidths[col] || 150 }}>
                    {String(row[col] || '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
          Exibir 
          <select 
            className="border rounded-lg px-2 py-1 outline-none bg-white font-bold text-slate-700 hover:border-slate-300 transition-all cursor-pointer" 
            value={rowsPerPage} 
            onChange={e => {
              const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
              setRowsPerPage(val);
              setPage(1);
            }}
          >
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            <option value="all">Exibir Todos</option>
          </select> 
          linhas
        </div>
        {rowsPerPage !== 'all' && (
          <div className="flex items-center gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"><ChevronLeft size={18} /></button>
            <span className="text-sm font-bold px-4 text-slate-700">{page} / {totalPages || 1}</span>
            <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"><ChevronRight size={18} /></button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticTable;
