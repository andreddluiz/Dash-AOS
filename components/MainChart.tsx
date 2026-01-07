
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
}

const MainChart: React.FC<MainChartProps> = ({ data, view, onBarClick, barThickness = 20 }) => {
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
      else if (view === 'tempo') key = row.range || 'N/A';
      
      if (!aggregates[key]) aggregates[key] = [];
      aggregates[key].push(row);
    });

    let labels: string[] = [];
    if (view === 'tempo') {
      labels = TEMPO_ORDER.filter(l => aggregates[l]);
    } else {
      labels = Object.keys(aggregates).sort((a, b) => aggregates[b].length - aggregates[a].length);
      // Limita a visualização inicial de Partnumbers aos top 50 para performance
      if (view === 'partnumber' && labels.length > 50) {
        labels = labels.slice(0, 50);
      }
    }

    const values = labels.map(l => aggregates[l].length);
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
            barPercentage: 1.0,
            categoryPercentage: 1.0,
            minBarLength: 2,
          },
        ],
        aggregates
      },
      maxValue: max
    };
  }, [data, view, isHorizontal, barThickness]);

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
        onBarClick(label, chartData.aggregates[label]);
      }
    }
  };

  return <Bar data={chartData} options={options} />;
};

export default MainChart;
