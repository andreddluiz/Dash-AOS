
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { AOSRow } from '../types';
import { ANALYTIC_COLUMNS, COLUMN_DISPLAY_NAMES, CHART_COLORS, TEMPO_ORDER } from '../constants';

export const exportToCsv = (data: AOSRow[], filename: string) => {
  const header = ANALYTIC_COLUMNS.map(c => COLUMN_DISPLAY_NAMES[c]).join(',');
  const rows = data.map(row => 
    ANALYTIC_COLUMNS.map(col => `"${String(row[col] || '').replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  
  const blob = new Blob([`${header}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

export const exportToExcel = (data: AOSRow[], filename: string) => {
  const wb = XLSX.utils.book_new();
  const headers = ANALYTIC_COLUMNS.map(c => COLUMN_DISPLAY_NAMES[c]);
  const aoa = [headers, ...data.map(row => ANALYTIC_COLUMNS.map(c => row[c] || ''))];
  
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, 'Detalhamento');
  XLSX.writeFile(wb, filename);
};

export const exportToPdf = (data: AOSRow[], title: string) => {
  const doc = new jsPDF('l', 'pt', 'a4');
  const headers = [ANALYTIC_COLUMNS.map(c => COLUMN_DISPLAY_NAMES[c])];
  const body = data.map(row => ANALYTIC_COLUMNS.map(c => String(row[c] || '')));

  doc.text(title, 40, 30);
  
  (doc as any).autoTable({
    startY: 50,
    head: headers,
    body: body,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [34, 118, 208] },
    margin: { left: 40, right: 40 },
    theme: 'striped'
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
};

export const exportToHtml = (data: AOSRow[], filename: string) => {
  const dataJson = JSON.stringify(data);
  const chartColorsJson = JSON.stringify(CHART_COLORS);
  const tempoOrderJson = JSON.stringify(TEMPO_ORDER);
  const columnNamesJson = JSON.stringify(COLUMN_DISPLAY_NAMES);
  const analyticColumnsJson = JSON.stringify(ANALYTIC_COLUMNS);

  const htmlContent = `
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>DASHBOARD AOS - OFFLINE</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root {
  --blue-50: #eff6ff; --blue-100: #dbeafe; --blue-200: #bfdbfe; --blue-600: #2563eb; --blue-700: #1d4ed8;
  --orange-50: #fff7ed; --orange-200: #fed7aa; --orange-600: #ea580c;
  --green-50: #f0fdf4; --green-200: #bbf7d0; --green-600: #16a34a;
  --slate-50: #f8fafc; --slate-100: #f1f5f9; --slate-200: #e2e8f0; --slate-400: #94a3b8; --slate-500: #64748b; --slate-600: #475569; --slate-800: #1e293b; --slate-900: #0f172a;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; background: #f8fafc; color: var(--slate-900); padding-bottom: 3rem; }

header { background: white; border-bottom: 1px solid var(--slate-200); position: sticky; top: 0; z-index: 30; padding: 1rem 1.5rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.header-container { max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; }
@media (min-width: 768px) { .header-container { flex-direction: row; justify-content: space-between; align-items: center; } }

.logo-area { display: flex; align-items: center; gap: 0.75rem; }
.logo-area h1 { font-size: 1.5rem; font-weight: 700; color: var(--slate-900); }
.month-badge { background: var(--blue-100); color: var(--blue-700); padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }

.tabs-container { display: flex; align-items: center; gap: 0.75rem; overflow-x: auto; padding-bottom: 0.25rem; }
.tabs-container::-webkit-scrollbar { display: none; }
.tabs-list { display: flex; background: var(--slate-100); padding: 0.25rem; border-radius: 0.5rem; }
.tab-btn { padding: 0.375rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 600; border: none; cursor: pointer; color: var(--slate-500); transition: all 0.2s; white-space: nowrap; background: transparent; }
.tab-btn.active { background: white; color: var(--blue-600); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

main { max-width: 1280px; margin: 2rem auto; padding: 0 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }

.stats-grid { display: grid; grid-template-cols: 1fr; gap: 1rem; }
@media (min-width: 768px) { .stats-grid { grid-template-cols: repeat(3, 1fr); } }

.stat-card { padding: 1.5rem; border-radius: 1rem; border: 2px solid transparent; transition: all 0.2s; }
.stat-card:hover { transform: translateY(-0.25rem); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
.stat-card.blue { border-color: var(--blue-200); background: var(--blue-50); color: var(--blue-600); }
.stat-card.orange { border-color: var(--orange-200); background: var(--orange-50); color: var(--orange-600); }
.stat-card.green { border-color: var(--green-200); background: var(--green-50); color: var(--green-600); }
.stat-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.8; margin-bottom: 0.5rem; }
.stat-value { font-size: 2.25rem; font-weight: 800; }

.card { background: white; border-radius: 1rem; border: 1px solid var(--slate-200); padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.card-header { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }
@media (min-width: 768px) { .card-header { flex-direction: row; justify-content: space-between; align-items: center; } }
.card-title { font-size: 1.25rem; font-weight: 700; color: var(--slate-900); }

.view-tabs { display: flex; background: var(--slate-100); padding: 0.25rem; border-radius: 0.75rem; }
.view-btn { padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 700; border: none; cursor: pointer; color: var(--slate-500); background: transparent; transition: all 0.2s; }
.view-btn.active { background: white; color: var(--blue-600); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

.chart-wrapper { height: 400px; width: 100%; position: relative; }

.table-section { border-radius: 1rem; overflow: hidden; border: 1px solid var(--slate-200); background: white; }
.table-section-header { padding: 1rem 1.5rem; background: var(--slate-50); border-bottom: 1px solid var(--slate-200); font-weight: 700; color: var(--slate-800); }
.table-container { width: 100%; overflow-x: auto; border-top: 1px solid var(--slate-100); }
table { width: 100%; border-collapse: collapse; min-width: 1800px; table-fixed: true; }
thead th { background: var(--slate-50); padding: 1rem; text-align: left; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--slate-500); border-bottom: 1px solid var(--slate-200); position: sticky; top: 0; }
tbody tr { transition: background 0.2s; border-bottom: 1px solid var(--slate-100); }
tbody tr:hover { background: #eff6ff; }
tbody td { padding: 0.875rem 1rem; font-size: 0.875rem; color: var(--slate-600); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-right: 1px solid #f8fafc; }
</style>
</head>
<body>

<header>
  <div class="header-container">
    <div class="logo-area">
      <h1>DASHBOARD AOS</h1>
      <span class="month-badge" id="currentMonthLabel">Geral</span>
    </div>
    <div class="tabs-container">
      <div class="tabs-list" id="monthTabs">
        <!-- Tabs injected by JS -->
      </div>
    </div>
  </div>
</header>

<main>
  <div class="stats-grid">
    <div class="stat-card blue">
      <div class="stat-label">Total de Registros</div>
      <div class="stat-value" id="statTotal">0</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-label">Bases Atendidas</div>
      <div class="stat-value" id="statBases">0</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">Mtl Utilizado</div>
      <div class="stat-value" id="statMTL">0</div>
    </div>
  </div>

  <section class="card">
    <div class="card-header">
      <h3 class="card-title" id="chartTitle">AOS por Base</h3>
      <div class="view-tabs" id="chartViewTabs">
        <button class="view-btn active" data-view="base">Bases</button>
        <button class="view-btn" data-view="tipo">MTL</button>
        <button class="view-btn" data-view="tempo">Tempo</button>
      </div>
    </div>
    <div class="chart-wrapper">
      <canvas id="mainChart"></canvas>
    </div>
  </section>

  <div class="table-section">
    <div class="table-section-header" id="tableTitle">Analítico Completo</div>
    <div class="table-container">
      <table id="dataTable">
        <thead id="tableHead"></thead>
        <tbody id="tableBody"></tbody>
      </table>
    </div>
  </div>
</main>

<script>
const rawData = ${dataJson};
const CHART_COLORS = ${chartColorsJson};
const TEMPO_ORDER = ${tempoOrderJson};
const COLUMN_DISPLAY_NAMES = ${columnNamesJson};
const ANALYTIC_COLUMNS = ${analyticColumnsJson};

let currentMonth = 'all';
let currentView = 'base';
let mainChart = null;

// Helper: Get Month Name
const getMonthName = (m) => {
  const names = {'01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun','07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez'};
  return names[m] || m;
};

// Generate Month Tabs
const initTabs = () => {
  const months = new Map();
  rawData.forEach(row => {
    const parts = row.start_date?.split('/');
    if (parts && parts.length === 3) {
      const mm = parts[1];
      const yyyy = parts[2];
      const key = mm + '/' + yyyy;
      if (!months.has(key)) {
        months.set(key, { label: getMonthName(mm) + '/' + yyyy, sortKey: parseInt(yyyy + mm) });
      }
    }
  });

  const sortedTabs = Array.from(months.entries()).sort((a,b) => a[1].sortKey - b[1].sortKey);
  const container = document.getElementById('monthTabs');
  
  let html = '<button class="tab-btn active" data-month="all">GERAL</button>';
  sortedTabs.forEach(([key, val]) => {
    html += '<button class="tab-btn" data-month="' + key + '">' + val.label + '</button>';
  });
  container.innerHTML = html;

  container.addEventListener('click', e => {
    if (e.target.dataset.month) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentMonth = e.target.dataset.month;
      document.getElementById('currentMonthLabel').textContent = e.target.textContent;
      updateDashboard();
    }
  });
};

const getFilteredData = () => {
  if (currentMonth === 'all') return rawData;
  return rawData.filter(row => {
    const parts = row.start_date?.split('/');
    if (!parts || parts.length !== 3) return false;
    return (parts[1] + '/' + parts[2]) === currentMonth;
  });
};

const updateStats = (data) => {
  document.getElementById('statTotal').textContent = data.length;
  document.getElementById('statBases').textContent = new Set(data.map(r => r.base).filter(Boolean)).size;
  document.getElementById('statMTL').textContent = data.filter(r => (r.mtl_utilizado || '').toUpperCase() === 'SIM').length;
};

const updateChart = (data) => {
  const ctx = document.getElementById('mainChart').getContext('2d');
  const aggregates = {};
  
  data.forEach(row => {
    let key = 'N/A';
    if (currentView === 'base') key = row.base || 'N/A';
    else if (currentView === 'tipo') key = row.analise_mtl || 'N/A';
    else if (currentView === 'tempo') key = row.range || 'N/A';
    if (!aggregates[key]) aggregates[key] = 0;
    aggregates[key]++;
  });

  let labels = [];
  if (currentView === 'tempo') {
    labels = TEMPO_ORDER.filter(l => aggregates[l]);
  } else {
    labels = Object.keys(aggregates).sort((a,b) => aggregates[b] - aggregates[a]);
  }
  const values = labels.map(l => aggregates[l]);

  if (mainChart) mainChart.destroy();
  mainChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: CHART_COLORS.slice(0, labels.length),
        borderRadius: 8,
        barThickness: 30,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: {
          display: true,
          anchor: 'end',
          align: 'top',
          color: '#475569',
          font: { weight: 'bold', size: 12 }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { weight: 'bold' } } },
        y: { beginAtZero: true, grid: { color: '#f1f5f9' } }
      }
    },
    plugins: [ChartDataLabels]
  });

  const titles = { base: 'AOS por Base', tipo: 'Tipo de Atendimento', tempo: 'Tempo Logístico Material' };
  document.getElementById('chartTitle').textContent = titles[currentView];
};

const updateTable = (data) => {
  const head = document.getElementById('tableHead');
  const body = document.getElementById('tableBody');
  
  head.innerHTML = '<tr>' + ANALYTIC_COLUMNS.map(c => '<th>' + COLUMN_DISPLAY_NAMES[c] + '</th>').join('') + '</tr>';
  body.innerHTML = data.map(row => '<tr>' + ANALYTIC_COLUMNS.map(c => '<td>' + (row[c] || '-') + '</td>').join('') + '</tr>').join('');
};

const updateDashboard = () => {
  const data = getFilteredData();
  updateStats(data);
  updateChart(data);
  updateTable(data);
};

// View Switcher
document.getElementById('chartViewTabs').addEventListener('click', e => {
  if (e.target.dataset.view) {
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentView = e.target.dataset.view;
    updateChart(getFilteredData());
  }
});

// Init
initTabs();
updateDashboard();
</script>
</body>
</html>
  `;
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};
