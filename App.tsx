
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  BarChart3, FileSpreadsheet, Download, Table, LayoutDashboard, 
  FileCode, Lock, Unlock, LogOut, X, Cloud, AlertCircle, Sparkles, Trash2, Search, Filter, Send,
  Settings2, Key
} from 'lucide-react';
import { AOSRow, ChartView } from './types';
import StatCard from './components/StatCard';
import MainChart from './components/MainChart';
import AnalyticTable from './components/AnalyticTable';
import { processExcelFile } from './services/excelService';
import { supabase } from './services/supabaseClient';
import { GoogleGenAI } from "@google/genai";

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
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  
  // Controles manuais de eixo/barras
  const [manualBarThickness, setManualBarThickness] = useState(20);
  const [manualRowHeight, setManualRowHeight] = useState(20.3);

  // AI States
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Diagnóstico de API KEY
  useEffect(() => {
    if (!process.env.API_KEY || process.env.API_KEY === "undefined") {
      console.warn("AVISO: API_KEY não detectada.");
      setApiKeyMissing(true);
    } else {
      console.log("INFO: API_KEY detectada.");
      setApiKeyMissing(false);
    }
  }, []);

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

  const generateAiSummary = async () => {
    if (!process.env.API_KEY) {
      alert("Erro: API_KEY ausente.");
      return;
    }
    setIsGeneratingAi(true);
    setAiSummary(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const dataString = filteredData.slice(0, 30).map(r => `Base:${r.base}|AC:${r.ac}|Tempo:${r.tempo_aos}`).join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analise estes dados de logística AOS GOL e resuma em português: ${dataString}`,
      });

      setAiSummary(response.text);
    } catch (err) {
      setAiSummary("Erro na comunicação com a IA.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const askAiQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim() || !process.env.API_KEY) return;
    setIsAnswering(true);
    setAiAnswer(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userQuestion,
      });
      setAiAnswer(response.text);
    } catch (err) {
      setAiAnswer("Erro ao processar pergunta.");
    } finally {
      setIsAnswering(false);
    }
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

  const acftList = useMemo(() => {
    const list = Array.from(new Set(rawData.map(r => r.ac).filter(Boolean))).sort();
    return list;
  }, [rawData]);

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
      return Math.max(400, uniqueCount * manualRowHeight + 80);
    }
    return 400;
  }, [chartView, filteredData, manualRowHeight]);

  return (
    <div className="min-h-screen pb-12 bg-slate-50">
      {apiKeyMissing && (
        <div className="bg-red-600 text-white px-6 py-2 flex items-center justify-center gap-2 text-xs font-bold animate-pulse">
          <Key size={14} /> AVISO: A VARIÁVEL 'API_KEY' NÃO FOI CONFIGURADA NO NETLIFY. AS FUNÇÕES DE IA NÃO FUNCIONARÃO.
        </div>
      )}

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
            <img src="https://logodownload.org/wp-content/uploads/2014/06/gol-logo-1.png" alt="GOL" className="h-8 object-contain" />
            <h1 className="text-2xl font-bold text-slate-900 border-l pl-4 border-slate-200">DASHBOARD AOS</h1>
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
            <section className="bg-gradient-to-br from-orange-500 to-slate-800 rounded-2xl p-6 shadow-xl text-white">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles /> Analista de IA GOL</h2>
                  <p className="text-orange-100 text-sm">Insights automáticos baseados nos registros.</p>
                </div>
                <button onClick={generateAiSummary} disabled={isGeneratingAi || filteredData.length === 0} className="bg-white text-slate-900 px-6 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-orange-50 disabled:opacity-50 transition-all">
                  {isGeneratingAi ? 'Analisando...' : 'Gerar Resumo'}
                </button>
              </div>
              <div className="space-y-4">
                <form onSubmit={askAiQuestion} className="relative">
                  <input type="text" value={userQuestion} onChange={(e) => setUserQuestion(e.target.value)} placeholder="Faça uma pergunta para a IA..." className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-12 text-white placeholder:text-white/50 outline-none focus:bg-white/20" />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white"><Send size={20} /></button>
                </form>
                {(aiSummary || aiAnswer) && (
                  <div className="bg-white/10 rounded-xl p-4 border border-white/20 text-sm leading-relaxed whitespace-pre-wrap">
                    {aiSummary || aiAnswer}
                  </div>
                )}
              </div>
            </section>

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

            <section className="bg-white rounded-2xl border p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Gráfico de Performance</h3>
                <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                  {(['base', 'acft', 'tipo', 'tempo'] as ChartView[]).map(v => (
                    <button key={v} onClick={() => setChartView(v)} className={`px-4 py-1.5 rounded-md text-xs font-bold ${chartView === v ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500'}`}>
                      {v.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[400px] overflow-auto">
                <div style={{ height: chartHeight + 'px' }}>
                  <MainChart data={filteredData} view={chartView} onBarClick={(l, r) => setSelectedBarData({ label: l, rows: r })} />
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
