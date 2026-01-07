
import React, { useState, useMemo, useRef } from 'react';
import { 
  ArrowUpDown, 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  GripVertical,
  Filter
} from 'lucide-react';
import { AOSRow, SortState } from '../types';
import { ANALYTIC_COLUMNS, COLUMN_DISPLAY_NAMES } from '../constants';
import { exportToExcel, exportToPdf } from '../services/exportService';

interface AnalyticTableProps {
  data: AOSRow[];
  fullData: AOSRow[];
}

const AnalyticTable: React.FC<AnalyticTableProps> = ({ data, fullData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState<SortState>({ col: 'start_date', dir: 1 });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Advanced Filters State
  const [filterColumn, setFilterColumn] = useState<keyof AOSRow | ''>('');
  const [filterValue, setFilterValue] = useState('');

  // Column Customization State
  const [columnOrder, setColumnOrder] = useState<(keyof AOSRow)[]>(ANALYTIC_COLUMNS);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    ANALYTIC_COLUMNS.reduce((acc, col) => ({ ...acc, [col]: 150 }), {})
  );

  // Drag and Drop Refs
  const dragColumn = useRef<number | null>(null);
  const dragOverColumn = useRef<number | null>(null);

  // Resize Ref
  const resizingCol = useRef<{ col: keyof AOSRow; startX: number; startWidth: number } | null>(null);

  const filteredData = useMemo(() => {
    let result = [...data];
    
    // Global Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(row => 
        columnOrder.some(col => String(row[col] || '').toLowerCase().includes(q))
      );
    }

    // Specific Advanced Filter
    if (filterColumn && filterValue) {
      const q = filterValue.toLowerCase();
      result = result.filter(row => 
        String(row[filterColumn] || '').toLowerCase().includes(q)
      );
    }
    
    // Sorting
    result.sort((a, b) => {
      const valA = String(a[sort.col] || '').toLowerCase();
      const valB = String(b[sort.col] || '').toLowerCase();
      return valA < valB ? -1 * sort.dir : valA > valB ? 1 * sort.dir : 0;
    });

    return result;
  }, [data, searchTerm, sort, filterColumn, filterValue, columnOrder]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const pagedData = filteredData.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleSort = (col: keyof AOSRow) => {
    setSort(prev => ({ col, dir: prev.col === col ? (prev.dir * -1 as 1 | -1) : 1 }));
  };

  // Drag and Drop Handlers
  const handleDragStart = (idx: number) => {
    dragColumn.current = idx;
  };

  const handleDragEnter = (idx: number) => {
    dragOverColumn.current = idx;
  };

  const handleDragEnd = () => {
    if (dragColumn.current !== null && dragOverColumn.current !== null) {
      const newOrder = [...columnOrder];
      const draggedItem = newOrder.splice(dragColumn.current, 1)[0];
      newOrder.splice(dragOverColumn.current, 0, draggedItem);
      setColumnOrder(newOrder);
    }
    dragColumn.current = null;
    dragOverColumn.current = null;
  };

  // Resize Handlers
  const handleResizeStart = (e: React.MouseEvent, col: keyof AOSRow) => {
    e.stopPropagation();
    e.preventDefault();
    resizingCol.current = {
      col,
      startX: e.pageX,
      startWidth: columnWidths[col] || 150
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (resizingCol.current) {
        const delta = moveEvent.pageX - resizingCol.current.startX;
        const newWidth = Math.max(80, resizingCol.current.startWidth + delta);
        setColumnWidths(prev => ({
          ...prev,
          [resizingCol.current!.col]: newWidth
        }));
      }
    };

    const onMouseUp = () => {
      resizingCol.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="space-y-0 flex flex-col max-w-full bg-white">
      {/* Search & Advanced Filters */}
      <div className="p-6 border-b border-slate-100 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Busca global em todas as colunas..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="group relative">
              <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-200 transition-colors">
                <Download size={16} /> Exportar Visão
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button onClick={() => exportToExcel(filteredData, 'visao_filtrada.xlsx')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 first:rounded-t-xl">Excel (Filtrado)</button>
                <button onClick={() => exportToPdf(filteredData, 'Visão Filtrada')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 last:rounded-b-xl border-t border-slate-100">PDF (Filtrado)</button>
              </div>
            </div>

            <div className="group relative">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm">
                <Download size={16} /> Exportar Completo
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button onClick={() => exportToExcel(fullData, 'dados_completos.xlsx')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 first:rounded-t-xl">Excel (Completo)</button>
                <button onClick={() => exportToPdf(fullData, 'Dados Completos')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 last:rounded-b-xl border-t border-slate-100">PDF (Completo)</button>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filter Row */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
            <Filter size={14} /> Filtro Avançado:
          </div>
          <select 
            className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none bg-white min-w-[150px]"
            value={filterColumn}
            onChange={e => setFilterColumn(e.target.value as keyof AOSRow)}
          >
            <option value="">Selecione Coluna</option>
            {ANALYTIC_COLUMNS.map(col => (
              <option key={col} value={col}>{COLUMN_DISPLAY_NAMES[col]}</option>
            ))}
          </select>
          <input 
            type="text" 
            placeholder="Valor para filtrar..."
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none bg-white flex-1 max-w-md"
            value={filterValue}
            onChange={e => setFilterValue(e.target.value)}
          />
          {(filterColumn || filterValue) && (
            <button 
              onClick={() => { setFilterColumn(''); setFilterValue(''); }}
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Limpar Filtro
            </button>
          )}
        </div>
      </div>

      {/* Table with Customization */}
      <div className="w-full overflow-x-auto border-b border-slate-200 relative">
        <table className="w-full border-collapse text-left table-fixed">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              {columnOrder.map((col, idx) => (
                <th 
                  key={col}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 hover:bg-slate-100 transition-colors select-none relative group/header"
                  style={{ width: columnWidths[col] || 150 }}
                >
                  <div className="flex items-center gap-2 cursor-move">
                    <GripVertical size={12} className="text-slate-300 opacity-0 group-hover/header:opacity-100 transition-opacity" />
                    <span className="truncate flex-1" onClick={() => handleSort(col)}>
                      {COLUMN_DISPLAY_NAMES[col]}
                    </span>
                    <ArrowUpDown 
                      size={12} 
                      className={`cursor-pointer ${sort.col === col ? 'text-blue-500' : 'text-slate-300'}`} 
                      onClick={(e) => { e.stopPropagation(); handleSort(col); }}
                    />
                  </div>
                  {/* Resize Handle */}
                  <div 
                    onMouseDown={(e) => handleResizeStart(e, col)}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 hover:w-1 transition-all z-20"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {pagedData.length > 0 ? (
              pagedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                  {columnOrder.map(col => (
                    <td 
                      key={col} 
                      className="px-4 py-3.5 text-sm text-slate-600 font-medium truncate border-r border-slate-50 last:border-r-0"
                      style={{ width: columnWidths[col] || 150 }}
                    >
                      {String(row[col] || '-')}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columnOrder.length} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                  Nenhum registro encontrado com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
          Exibir
          <select 
            className="border border-slate-200 rounded-lg px-2 py-1 outline-none"
            value={rowsPerPage}
            onChange={e => setRowsPerPage(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          linhas
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-slate-500">
            {filteredData.length} registros
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(prev => prev - 1)}
              className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-bold px-4 bg-white border border-slate-200 rounded-lg py-1.5 shadow-sm min-w-[100px] text-center">
              {page} / {totalPages || 1}
            </span>
            <button 
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage(prev => prev + 1)}
              className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 transition-all shadow-sm"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticTable;
