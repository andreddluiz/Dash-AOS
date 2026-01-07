
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  BarChart3, FileSpreadsheet, Download, Table, LayoutDashboard, 
  FileCode, Lock, Unlock, LogOut, X, Cloud
} from 'lucide-react';
import { AOSRow, ChartView } from './types';
import StatCard from './components/StatCard';
import MainChart from './components/MainChart';
import AnalyticTable from './components/AnalyticTable';
import { processExcelFile } from './services/excelService';
import { exportToCsv, exportToHtml } from './services/exportService';
import { supabase } from './services/supabaseClient';

const AUTH_STORAGE_KEY = 'dashboard_aos_auth';
const SESSION_DURATION = 24 * 60 * 60 * 1000;
const ADMIN_PASSWORD = 'admin';

const App: React.FC = () => {
  const [rawData, setRawData] = useState<AOSRow[]>([]);
  const [currentMonth, setCurrentMonth] = useState<string>('all');
  const [chartView, setChartView] = useState<ChartView>('base');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedBarData, setSelectedBarData] = useState<{ label: string; rows: AOSRow[] } | null>(null);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Carregar dados do SUPABASE ao iniciar
  const fetchSupabaseData = async () => {
    setIsLoadingData(true);
    const { data, error } = await supabase
      .from('aos_records')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error("Erro ao carregar dados do Supabase:", error);
    } else {
      setRawData(data || []);
    }
    setIsLoadingData(false);
  };

  useEffect(() => {
    fetchSupabaseData();

    // Check Session
    const authData = localStorage.getItem(AUTH_STORAGE_KEY);
    if (authData) {
      try {
        const { timestamp } = JSON.parse(authData);
        if (Date.now() - timestamp < SESSION_DURATION) {
          setIsAuthenticated(true);
        }
      } catch (e) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setShowLoginModal(false);
      setPasswordInput('');
      setLoginError('');
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
      
      // Salvar no Supabase
      const { error } = await supabase.from('aos_records').insert(newData);
      
      if (error) throw error;

      // Recarregar dados para garantir sincronia
      await fetchSupabaseData();
      setSelectedBarData(null);
      alert(`${newData.length} registros salvos na nuvem!`);
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao salvar dados no banco de dados.");
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  const clearData = async () => {
    if (!isAuthenticated) return;
    if (confirm("ATENÇÃO: Isso apagará TODOS os dados da nuvem. Continuar?")) {
      const { error } = await supabase.from('aos_records').delete().neq('id', 0);
      if (error) {
        alert("Erro ao limpar banco.");
      } else {
        setRawData([]);
        setCurrentMonth('all');
        alert("Banco de dados limpo com sucesso.");
      }
    }
  };

  // Memoized stats e tabs seguem a mesma lógica anterior...
  const monthTabs = useMemo(() => {
    const months = new Map<string, { label: string, sortKey: number }>();
    const monthNames: Record<string, string> = {
      '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', 
      '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago', 
      '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
    };
    rawData.forEach(row => {
      const parts = row.start_date?.split('/');
      if (parts?.length === 3) {
        const mm = parts[1];
        const yyyy = parts[2];
        const key = `${mm}/${yyyy}`;
        if (!months.has(key)) {
          months.set(key, { label: `${monthNames[mm] || mm}/${yyyy}`, sortKey: parseInt(yyyy + mm) });
        }
      }
    });
    return Array.from(months.entries()).sort((a, b) => a[1].sortKey - b[1].sortKey).map(([key, value]) => ({ key, label: value.label }));
  }, [rawData]);

  const filteredData = useMemo(() => {
    if (currentMonth === 'all') return rawData;
    return rawData.filter(row => {
      const parts = row.start_date?.split('/');
      if (!parts || parts.length !== 3) return false;
      return `${parts[1]}/${parts[2]}` === currentMonth;
    });
  }, [rawData, currentMonth]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    const bases = new Set(filteredData.map(r => r.base).filter(Boolean)).size;
    const mtl = filteredData.filter(r => (r.mtl_utilizado || '').toUpperCase() === 'SIM').length;
    return { total, bases, mtl };
  }, [filteredData]);

  return (
    <div className="min-h-screen pb-12">
      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Lock className="text-blue-600" />Admin</h2>
              <button onClick={() => setShowLoginModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none" placeholder="Senha..." autoFocus />
              {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Entrar</button>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><LayoutDashboard className="text-blue-600" />DASHBOARD AOS</h1>
            <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter">
              <Cloud size={10} /> Nuvem Ativa
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide max-w-full">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setCurrentMonth('all')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${currentMonth === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>GERAL</button>
              {monthTabs.map(tab => (
                <button key={tab.key} onClick={() => setCurrentMonth(tab.key)} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${currentMonth === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>{tab.label}</button>
              ))}
            </div>
            <div className="flex gap-2">
              {isAuthenticated ? (
                <button onClick={handleLogout} className="flex items-center gap-2 bg-red-50 text-red-600 border px-4 py-1.5 rounded-lg text-sm font-semibold"><LogOut size={16} />Sair</button>
              ) : (
                <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm"><Unlock size={16} />Admin</button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-6">
        {isLoadingData && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-blue-700 text-center animate-pulse">
            Sincronizando com o banco de dados na nuvem...
          </div>
        )}

        {isAuthenticated && (
          <section className="bg-white rounded-2xl border-2 border-blue-600 border-dashed p-6 shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Cloud size={20} className="text-blue-600" />Painel de Importação Cloud</h2>
                <p className="text-sm text-slate-500">Dados importados aqui serão visíveis para todos os usuários em tempo real.</p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button onClick={clearData} className="px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-semibold">Limpar Tudo</button>
                <label className="flex-1 md:flex-none relative cursor-pointer group">
                  <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={isProcessing} />
                  <div className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200">
                    {isProcessing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FileSpreadsheet size={20} />}
                    {isProcessing ? 'Enviando...' : 'Subir para Nuvem'}
                  </div>
                </label>
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total (Nuvem)" value={stats.total} color="blue" />
          <StatCard label="Bases Atendidas" value={stats.bases} color="orange" />
          <StatCard label="Mtl Utilizado" value={stats.mtl} color="green" />
        </div>

        <section className="bg-white rounded-2xl border p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="text-xl font-bold text-slate-900">Visualização de Performance</h3>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {(['base', 'tipo', 'tempo'] as ChartView[]).map(v => (
                <button key={v} onClick={() => setChartView(v)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${chartView === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>{v === 'base' ? 'Bases' : v === 'tipo' ? 'MTL' : 'Tempo'}</button>
              ))}
            </div>
          </div>
          <div className="h-[400px] w-full">
            <MainChart data={filteredData} view={chartView} onBarClick={(label, rows) => setSelectedBarData({ label, rows })} />
          </div>
        </section>

        {(selectedBarData || filteredData.length > 0) && (
          <section className="bg-white rounded-2xl border overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-slate-800">{selectedBarData ? `Analítico: ${selectedBarData.label}` : 'Analítico Completo'}</h3>
              <button onClick={() => setSelectedBarData(null)} className="text-blue-600 text-sm font-bold hover:underline">Ver Todos</button>
            </div>
            <AnalyticTable data={selectedBarData ? selectedBarData.rows : filteredData} fullData={rawData} />
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
