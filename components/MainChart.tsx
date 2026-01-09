
import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { AOSRow, ChartView } from '../types';
import { TEMPO_ORDER, CHART_COLORS } from '../constants';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface MainChartProps {
  data: AOSRow[];
  view: ChartView;
  onBarClick: (label: string, rows: AOSRow[]) => void;
  barThickness?: number;
  barPercentage?: number;
  categoryPercentage?: number;
}

const MainChart: React.FC<MainChartProps> = ({ 
  data, 
  view, 
  onBarClick, 
  barThickness = 25,
  barPercentage = 0.9,
  categoryPercentage = 0.8
}) => {
  // Aeronaves e Partnumbers usam layout horizontal devido à quantidade de itens
  const isHorizontal = view === 'acft' || view === 'partnumber';

  const { chartData, maxValue } = useMemo(() => {
    const aggregates: Record<string, AOSRow[]> = {};
    
    data.forEach(row => {
      let key = 'N/A';
      if (view === 'base') key = row.base || 'N/A';
      else if (view === 'acft') key = row.ac || 'N/A';
      else if (view === 'partnumber') key = row.partnumber || 'N/A';
      else if (view === 'tipo') key = row.analise_mtl || 'N/A';
      else if (view === 'tempo') {
        const r = (row.range || '').toLowerCase().trim();
        
        // Mapeamento preciso baseado na coluna Range
        if (r.includes('48') && (r.includes('acima') || r.includes('>') || r.includes('+'))) {
          key = "acima de 48h";
        } else if (r.includes('24') && r.includes('48')) {
          key = "24 e 48h";
        } else if (r.includes('12') && r.includes('24')) {
          key = "12 e 24h";
        } else if (r.includes('6') && r.includes('12')) {
          key = "6 e 12h";
        } else if (r.includes('1') && r.includes('6')) {
          key = "1 e 6h";
        } else if (r.includes('0') && r.includes('1')) {
          key = "0 e 1h";
        } else {
          // Tentativas de fallback para strings menos padronizadas
          if (r.includes('48')) key = "acima de 48h";
          else if (r.includes('24')) key = "12 e 24h";
          else if (r.includes('12')) key = "6 e 12h";
          else if (r.includes('6')) key = "1 e 6h";
          else if (r.includes('1')) key = "0 e 1h";
          else key = "SEM INFORMAÇÃO";
        }
      }
      
      if (!aggregates[key]) aggregates[key] = [];
      aggregates[key].push(row);
    });

    let labels: string[] = [];
    if (view === 'tempo') {
      // Força a exibição das 6 barras solicitadas na ordem correta
      labels = TEMPO_ORDER;
    } else {
      labels = Object.keys(aggregates).sort((a, b) => (aggregates[b]?.length || 0) - (aggregates[a]?.length || 0));
      // Limita a visualização inicial de Partnumbers aos top 50 para performance
      if (view === 'partnumber' && labels.length > 50) {
        labels = labels.slice(0, 50);
      }
    }

    const values = labels.map(l => aggregates[l]?.length || 0);
    const max = values.length > 0 ? Math.max(...values) : 0;

    return {
      chartData: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
            borderRadius: isHorizontal 
              ? { topRight: 8, bottomRight: 8 } 
              : { topLeft: 8, topRight: 8 },
            barThickness: barThickness,
            barPercentage: barPercentage,
            categoryPercentage: categoryPercentage,
            minBarLength: 2,
          },
        ],
        aggregates
      },
      maxValue: max
    };
  }, [data, view, isHorizontal, barThickness, barPercentage, categoryPercentage]);

  const options = {
    indexAxis: isHorizontal ? 'y' as const : 'x' as const,
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: isHorizontal 
        ? { right: 80, left: 20, top: 10, bottom: 10 } 
        : { top: 50, bottom: 20, left: 15, right: 15 }
    },
    plugins: {
      legend: { display: false },
      datalabels: {
        display: true,
        anchor: 'end' as const,
        align: isHorizontal ? 'right' as const : 'top' as const,
        color: '#475569',
        font: { weight: 'bold' as const, size: 10 },
        formatter: (value: number) => value,
        offset: 6,
        clip: false
      },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 10,
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        displayColors: false,
      }
    },
    scales: {
      x: { 
        grid: { display: isHorizontal, color: '#f1f5f9' }, 
        ticks: { 
          font: { weight: 'bold' as const, size: 10 },
          maxRotation: isHorizontal ? 0 : 45,
          minRotation: isHorizontal ? 0 : 0,
          autoSkip: true
        },
        beginAtZero: true,
        border: { display: false },
        suggestedMax: isHorizontal ? maxValue * 1.15 : undefined
      },
      y: { 
        grid: { display: !isHorizontal, color: '#f1f5f9' }, 
        ticks: { 
          font: { weight: 'bold' as const, size: 10 },
          padding: 8
        },
        beginAtZero: true, 
        border: { display: false },
        suggestedMax: !isHorizontal ? maxValue * 1.15 : undefined
      },
    },
    onClick: (_: any, elements: any[]) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const label = chartData.labels[index];
        onBarClick(label, chartData.aggregates[label] || []);
      }
    }
  };

  return <Bar data={chartData} options={options} />;
};

export default MainChart;
