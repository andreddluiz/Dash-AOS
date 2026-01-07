
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  BarChart3, FileSpreadsheet, Download, Table, LayoutDashboard, 
  FileCode, Lock, Unlock, LogOut, X, Cloud, AlertCircle, Sparkles, Trash2, Search, Filter, Send,
  Settings2
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
    if (!process.env.API_KEY) {
      console.warn("AVISO: API_KEY não detectada. Verifique as variáveis de ambiente no Netlify.");
    } else {
      console.log("INFO: API_KEY configurada corretamente.");
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
        setConnError("Não foi possível conectar ao banco. Verifique as chaves no arquivo supabaseClient.ts");
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
      alert("Erro: Chave de API da IA não configurada no Netlify.");
      return;
    }
    setIsGeneratingAi(true);
    setAiSummary(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const dataString = filteredData.map(r => `Base:${r.base}|AC:${r.ac}|Tempo:${r.tempo_aos}|MTL:${r.mtl_utilizado}`).join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analise o seguinte conjunto completo de dados de logística de aviação (AOS) e forneça um resumo executivo profissional:
        Dados:
        ${dataString}`,
        config: { systemInstruction: "Você é um Analista de Logística Sênior da GOL Linhas Aéreas. Fale sobre desempenho de bases, eficiência de MTL e tendências baseando-se em TODOS os dados fornecidos." }
      });

      setAiSummary(response.text);
    } catch (err) {
      setAiSummary("Erro ao gerar resumo com IA. O conjunto de dados pode ser muito grande para uma única requisição.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const askAiQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;
    if (!process.env.API_KEY) {
      alert("Erro: Chave de API da IA não configurada.");
      return;
    }
    setIsAnswering(true);
    setAiAnswer(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const dataString = filteredData.map(r => `Base:${r.base}|AC:${r.ac}|Tempo:${r.tempo_aos}|MTL:${r.mtl_utilizado}|Range:${r.range}`).join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Pergunta do Usuário: ${userQuestion}\n\nBase de Dados Completa:\n${dataString}`,
        config: { systemInstruction: "Você é um especialista em análise de dados de aviação da GOL. Responda à pergunta do usuário de forma concisa e técnica usando exclusivamente os dados fornecidos." }
      });

      setAiAnswer(response.text);
    } catch (err) {
      setAiAnswer("Não foi possível processar sua pergunta agora.");
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
    return Array.from(months.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => {
        const [mA, yA] = a.key.split('/').map(Number);
        const [mB, yB] = b.key.split('/').map(Number);
        return (yA * 100 + mA) - (yB * 100 + mB);
      });
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
    <div className="min-h-screen pb-12 transition-colors duration-500">
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Lock className="text-orange-600" />Admin Access</h2>
              <button onClick={() => setShowLoginModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-100" placeholder="Senha..." autoFocus />
              {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
              <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors">Entrar</button>
            </form>
          </div>
        </div>
      )}

      <header className="bg-white border-b sticky top-0 z-30 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <img 
              src="https://logodownload.org/wp-content/uploads/2014/06/gol-logo-1.png" 
              alt="GOL" 
              className="h-8 md:h-10 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/GOL_Linhas_A%C3%A9reas_Logo.svg/1024px-GOL_Linhas_A%C3%A9reas_Logo.svg.png';
              }}
            />
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 border-l pl-4 border-slate-200 uppercase tracking-tight">DASHBOARD AOS</h1>
            <div className="hidden sm:flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter border border-orange-100">
              <Cloud size={10} /> Sincronizado
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setCurrentMonth('all')} 
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${currentMonth === 'all' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
              >
                GERAL
              </button>
              {monthTabs.map(tab => (
                <button 
                  key={tab.key} 
                  onClick={() => setCurrentMonth(tab.key)} 
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${currentMonth === tab.key ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            {isAuthenticated ? (
              <button onClick={handleLogout} className="flex items-center gap-2 bg-red-50 text-red-600 border px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-100 transition-all"><LogOut size={16} />Sair</button>
            ) : (
              <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-slate-900 transition-all"><Unlock size={16} />Admin</button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-6">
        {connError && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 flex items-center gap-3">
            <AlertCircle className="shrink-0" /><p className="text-sm font-medium">{connError}</p>
          </div>
        )}

        <section className="bg-gradient-to-br from-orange-500 to-slate-300 rounded-2xl p-6 shadow-xl text-slate-800 space-y-6 border border-white/20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-black/5 pb-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900"><Sparkles className="text-orange-600" /> Analista de IA GOL</h2>
              <p className="text-slate-600 text-sm font-medium">Análise estratégica e insights baseados em dados reais.</p>
            </div>
            <button 
              onClick={generateAiSummary} 
              disabled={isGeneratingAi || filteredData.length === 0}
              className="flex items-center gap-2 bg-white/40 hover:bg-white/60 backdrop-blur-md px-6 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 text-slate-900 border border-white/40"
            >
              {isGeneratingAi ? <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={18} />}
              {isGeneratingAi ? 'Analisando...' : 'Gerar Resumo Operacional'}
            </button>
          </div>

          <div className="space-y-4">
            <form onSubmit={askAiQuestion} className="relative">
              <input 
                type="text" 
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder="Ex: Quais P/N causaram mais paradas em Guarulhos?"
                className="w-full bg-white/40 border border-white/60 rounded-xl px-4 py-3.5 pr-12 outline-none focus:ring-2 focus:ring-orange-600/30 placeholder:text-slate-500 text-slate-900 font-medium"
              />
              <button 
                type="submit" 
                disabled={isAnswering || !userQuestion.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-black/5 rounded-lg transition-colors disabled:opacity-30 text-slate-900"
              >
                {isAnswering ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <Send size={20} />}
              </button>
            </form>

            {(aiSummary || aiAnswer) && (
              <div className="bg-white/50 rounded-xl p-6 border border-white/60 animate-in fade-in slide-in-from-top-2 max-h-[400px] overflow-y-auto scrollbar-hide shadow-inner">
                {aiSummary && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700 mb-2">Resumo Geral Operacional</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{aiSummary}</p>
                  </div>
                )}
                {aiAnswer && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700 mb-2">Resposta Especialista</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{aiAnswer}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {isAuthenticated && (
          <section className="bg-white rounded-2xl border-2 border-orange-600 border-dashed p-6 shadow-md">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Cloud size={20} className="text-orange-600" />Painel de Importação</h2>
                <p className="text-sm text-slate-500">Alimente a base de dados GOL AOS via Excel.</p>
              </div>
              <label className="cursor-pointer group">
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={isProcessing} />
                <div className="flex items-center justify-center gap-2 px-8 py-3.5 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all">
                  {isProcessing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FileSpreadsheet size={20} />}
                  {isProcessing ? 'Enviando...' : 'Importar Novos Dados'}
                </div>
              </label>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total de Registros" value={stats.total} color="orange" />
          <StatCard label="Bases Atendidas" value={stats.bases} color="blue" />
          <StatCard label="Mtl Utilizado" value={stats.mtl} color="green" />
          <StatCard label="P/N's Diferentes" value={stats.partnumbers} color="purple" />
        </div>

        <section className="bg-white rounded-2xl border p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="text-xl font-bold text-slate-900">Visualização de Performance</h3>
            <div className="flex flex-wrap items-center gap-4">
              {/* Controles de Redimensionamento Manual */}
              <div className="flex items-center gap-4 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 shadow-inner">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Settings2 size={10}/> Espessura</label>
                  <input 
                    type="range" min="5" max="50" step="1" 
                    value={manualBarThickness} 
                    onChange={(e) => setManualBarThickness(Number(e.target.value))}
                    className="w-24 accent-orange-600 cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Settings2 size={10}/> Aproximação</label>
                  <input 
                    type="range" min="2" max="60" step="0.1" 
                    value={manualRowHeight} 
                    onChange={(e) => setManualRowHeight(Number(e.target.value))}
                    className="w-24 accent-orange-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                <select 
                  value={selectedAcft} 
                  onChange={(e) => setSelectedAcft(e.target.value)}
                  className="bg-white px-3 py-1.5 rounded-lg text-sm font-bold text-slate-700 border border-slate-200 outline-none focus:ring-2 focus:ring-orange-200"
                >
                  <option value="all">Frotas GOL (Todas)</option>
                  {acftList.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1"></div>
                {(['base', 'acft', 'partnumber', 'tipo', 'tempo'] as ChartView[]).map(v => (
                  <button 
                    key={v} 
                    onClick={() => setChartView(v)} 
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${chartView === v ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    {v === 'base' ? 'Bases' : v === 'acft' ? 'Aeronaves' : v === 'partnumber' ? 'Partnumbers' : v === 'tipo' ? 'MTL' : 'Tempo'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="w-full overflow-y-auto overflow-x-hidden scrollbar-hide border rounded-xl" style={{ height: '420px' }}>
            <div style={{ height: chartHeight + 'px', width: '100%' }}>
              <MainChart 
                data={filteredData} 
                view={chartView} 
                onBarClick={(label, rows) => setSelectedBarData({ label, rows })} 
                barThickness={manualBarThickness}
              />
            </div>
          </div>
        </section>

        {(selectedBarData || filteredData.length > 0) && (
          <section className="bg-white rounded-2xl border overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-slate-800">{selectedBarData ? `Detalhamento: ${selectedBarData.label}` : 'Analítico Completo'}</h3>
              <button onClick={() => setSelectedBarData(null)} className="text-orange-600 text-sm font-bold hover:underline">Limpar Seleção</button>
            </div>
            <AnalyticTable 
              data={selectedBarData ? selectedBarData.rows : filteredData} 
              fullData={rawData} 
              isAdmin={isAuthenticated} 
              onDelete={deleteRow}
            />
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
