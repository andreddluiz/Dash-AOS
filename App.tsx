
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  BarChart3, FileSpreadsheet, Download, Table, LayoutDashboard, 
  FileCode, Lock, Unlock, LogOut, X, Cloud, AlertCircle, Trash2, Search, Filter,
  Settings2, Key, SlidersHorizontal
} from 'lucide-react';
import { AOSRow, ChartView } from './types';
import StatCard from './components/StatCard';
import MainChart from './components/MainChart';
import AnalyticTable from './components/AnalyticTable';
import { processExcelFile } from './services/excelService';
import { supabase } from './services/supabaseClient';

const AUTH_STORAGE_KEY = 'dashboard_aos_auth';
const SESSION_DURATION = 24 * 60 * 60 * 1000;
const ADMIN_PASSWORD = 'admin';

const App: React.FC = () => {
  const [rawData, setRawData] = useState<AOSRow[]>([]);
  const [currentMonth, setCurrentMonth] = useState<string>('all');
  const [selectedAcft, setSelectedAcft] = useState<string>('all');
  const [chartView, setChartView] = useState<ChartView>('base');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedBarData, setSelectedBarData] = useState<{ label: string; rows: AOSRow[] } | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  
  // Controles manuais de gráfico
  const [manualBarThickness, setManualBarThickness] = useState(25);
  const [manualRowHeight, setManualRowHeight] = useState(22);
  const [manualChartWidth, setManualChartWidth] = useState(100);
  const [manualBarPercentage, setManualBarPercentage] = useState(0.9);
  const [manualCategoryPercentage, setManualCategoryPercentage] = useState(0.8);
  const [showChartSettings, setShowChartSettings] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const fetchSupabaseData = async () => {
    setIsLoadingData(true);
    setConnError(null);
    try {
      const { data, error } = await supabase
        .from('aos_records')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        setConnError("Erro ao carregar dados do Supabase.");
      } else {
        setRawData(data || []);
      }
    } catch (err) {
      setConnError("Erro crítico de conexão.");
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchSupabaseData();
    const authData = localStorage.getItem(AUTH_STORAGE_KEY);
    if (authData) {
      try {
        const { timestamp } = JSON.parse(authData);
        if (Date.now() - timestamp < SESSION_DURATION) setIsAuthenticated(true);
      } catch (e) { localStorage.removeItem(AUTH_STORAGE_KEY); }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setShowLoginModal(false);
      setPasswordInput('');
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ timestamp: Date.now() }));
    } else {
      setLoginError('Senha incorreta.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthenticated) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const newData = await processExcelFile(file);
      const { error } = await supabase.from('aos_records').insert(newData);
      if (error) throw error;
      await fetchSupabaseData();
      alert(`Sucesso! ${newData.length} registros salvos.`);
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  const deleteRow = async (id: number) => {
    if (!isAuthenticated) return;
    if (!confirm("Excluir este registro permanentemente?")) return;
    
    const { error } = await supabase.from('aos_records').delete().eq('id', id);
    if (error) alert("Erro ao excluir: " + error.message);
    else await fetchSupabaseData();
  };

  const filteredData = useMemo(() => {
    let data = rawData;
    if (currentMonth !== 'all') {
      data = data.filter(row => {
        const parts = row.start_date?.split('/');
        return parts && `${parts[1]}/${parts[2]}` === currentMonth;
      });
    }
    if (selectedAcft !== 'all') {
      data = data.filter(row => row.ac === selectedAcft);
    }
    return data;
  }, [rawData, currentMonth, selectedAcft]);

  const monthTabs = useMemo(() => {
    const months = new Map<string, string>();
    const monthNames: Record<string, string> = { '01':'Jan', '02':'Fev', '03':'Mar', '04':'Abr', '05':'Mai', '06':'Jun', '07':'Jul', '08':'Ago', '09':'Set', '10':'Out', '11':'Nov', '12':'Dez' };
    rawData.forEach(row => {
      const parts = row.start_date?.split('/');
      if (parts?.length === 3) {
        const key = `${parts[1]}/${parts[2]}`;
        const label = `${monthNames[parts[1]] || parts[1]}/${parts[2]}`;
        months.set(key, label);
      }
    });
    return Array.from(months.entries()).map(([key, label]) => ({ key, label }));
  }, [rawData]);

  const stats = useMemo(() => ({
    total: filteredData.length,
    bases: new Set(filteredData.map(r => r.base).filter(Boolean)).size,
    mtl: filteredData.filter(r => (r.mtl_utilizado || '').toUpperCase() === 'SIM').length,
    partnumbers: new Set(filteredData.map(r => r.partnumber).filter(Boolean)).size
  }), [filteredData]);

  const chartHeight = useMemo(() => {
    if (chartView === 'acft' || chartView === 'partnumber') {
      const field = chartView === 'acft' ? 'ac' : 'partnumber';
      const uniqueCount = new Set(filteredData.map(r => r[field as keyof AOSRow])).size;
      const count = chartView === 'partnumber' ? Math.min(uniqueCount, 50) : uniqueCount;
      return Math.max(400, count * manualRowHeight + 80);
    }
    return 400;
  }, [chartView, filteredData, manualRowHeight]);

  return (
    <div className="min-h-screen pb-12 bg-slate-50">
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Lock className="text-orange-600" />Admin Access</h2>
              <button onClick={() => setShowLoginModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full px-4 py-3 border rounded-xl" placeholder="Senha..." autoFocus />
              {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
              <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold">Entrar</button>
            </form>
          </div>
        </div>
      )}

      <header className="bg-white border-b sticky top-0 z-30 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900">DASHBOARD AOS</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentMonth('all')} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${currentMonth === 'all' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}>GERAL</button>
            {monthTabs.map(tab => (
              <button key={tab.key} onClick={() => setCurrentMonth(tab.key)} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${currentMonth === tab.key ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{tab.label}</button>
            ))}
            {isAuthenticated ? (
              <button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-1.5 rounded-lg text-sm font-bold ml-4">Sair</button>
            ) : (
              <button onClick={() => setShowLoginModal(true)} className="bg-slate-800 text-white px-4 py-1.5 rounded-lg text-sm font-bold ml-4">Admin</button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-6">
        {isLoadingData ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-bold animate-pulse">CARREGANDO DADOS DA GOL...</p>
          </div>
        ) : (
          <>
            {isAuthenticated && (
              <section className="bg-white rounded-2xl border-2 border-orange-600 border-dashed p-6 flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-slate-900">Importação de Dados</h2>
                  <p className="text-sm text-slate-500">Envie o arquivo Excel para atualizar o banco.</p>
                </div>
                <label className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold cursor-pointer hover:bg-orange-700 transition-all">
                  <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                  {isProcessing ? 'Processando...' : 'Selecionar Arquivo'}
                </label>
              </section>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard label="Total de Registros" value={stats.total} color="orange" />
              <StatCard label="Bases Atendidas" value={stats.bases} color="blue" />
              <StatCard label="Mtl Utilizado" value={stats.mtl} color="green" />
              <StatCard label="Partnumbers" value={stats.partnumbers} color="purple" />
            </div>

            <section className="bg-white rounded-2xl border p-6 shadow-sm overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h3 className="text-xl font-bold text-slate-900">Gráfico de Performance</h3>
                
                <div className="flex flex-wrap items-center gap-3">
                  <button 
                    onClick={() => setShowChartSettings(!showChartSettings)}
                    className={`p-2 rounded-lg transition-colors ${showChartSettings ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    title="Ajustes Manuais"
                  >
                    <SlidersHorizontal size={18} />
                  </button>

                  <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                    {(['base', 'tipo', 'tempo', 'partnumber', 'acft'] as ChartView[]).map(v => (
                      <button key={v} onClick={() => setChartView(v)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${chartView === v ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}>
                        {v === 'partnumber' ? 'PART NUMBER' : v.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {showChartSettings && (
                <div className="mb-6 p-4 bg-slate-50 border rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 animate-in slide-in-from-top duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Largura (%)</label>
                    <input 
                      type="range" min="50" max="100" step="1" 
                      value={manualChartWidth} onChange={e => setManualChartWidth(Number(e.target.value))}
                      className="w-full accent-orange-600"
                    />
                    <div className="text-[10px] text-right text-slate-400 font-mono">{manualChartWidth}%</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Espessura Barras</label>
                    <input 
                      type="range" min="5" max="60" step="1" 
                      value={manualBarThickness} onChange={e => setManualBarThickness(Number(e.target.value))}
                      className="w-full accent-orange-600"
                    />
                    <div className="text-[10px] text-right text-slate-400 font-mono">{manualBarThickness}px</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Altura Item (px)</label>
                    <input 
                      type="range" min="10" max="60" step="1" 
                      value={manualRowHeight} onChange={e => setManualRowHeight(Number(e.target.value))}
                      className="w-full accent-orange-600"
                    />
                    <div className="text-[10px] text-right text-slate-400 font-mono">{manualRowHeight}px</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Aproximação 1 (Bar)</label>
                    <input 
                      type="range" min="0.1" max="1" step="0.05" 
                      value={manualBarPercentage} onChange={e => setManualBarPercentage(Number(e.target.value))}
                      className="w-full accent-orange-600"
                    />
                    <div className="text-[10px] text-right text-slate-400 font-mono">{manualBarPercentage}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Aproximação 2 (Cat)</label>
                    <input 
                      type="range" min="0.1" max="1" step="0.05" 
                      value={manualCategoryPercentage} onChange={e => setManualCategoryPercentage(Number(e.target.value))}
                      className="w-full accent-orange-600"
                    />
                    <div className="text-[10px] text-right text-slate-400 font-mono">{manualCategoryPercentage}</div>
                  </div>
                </div>
              )}

              <div className="h-[400px] overflow-auto border rounded-xl bg-white scrollbar-hide">
                <div style={{ height: chartHeight + 'px', width: manualChartWidth + '%', margin: '0 auto' }}>
                  <MainChart 
                    data={filteredData} 
                    view={chartView} 
                    onBarClick={(l, r) => setSelectedBarData({ label: l, rows: r })} 
                    barThickness={manualBarThickness}
                    barPercentage={manualBarPercentage}
                    categoryPercentage={manualCategoryPercentage}
                  />
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border shadow-sm">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">{selectedBarData ? `Filtro: ${selectedBarData.label}` : 'Dados Analíticos'}</h3>
                {selectedBarData && <button onClick={() => setSelectedBarData(null)} className="text-orange-600 text-xs font-bold uppercase tracking-tighter">Limpar Filtro</button>}
              </div>
              <AnalyticTable data={selectedBarData ? selectedBarData.rows : filteredData} fullData={rawData} isAdmin={isAuthenticated} onDelete={deleteRow} />
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
