
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
}

const MainChart: React.FC<MainChartProps> = ({ data, view, onBarClick }) => {
  const chartData = useMemo(() => {
    const aggregates: Record<string, AOSRow[]> = {};
    
    data.forEach(row => {
      let key = 'N/A';
      if (view === 'base') key = row.base || 'N/A';
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
    }

    const values = labels.map(l => aggregates[l].length);

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: CHART_COLORS.slice(0, labels.length),
          borderRadius: 8,
          barThickness: 30,
        },
      ],
      aggregates
    };
  }, [data, view]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: {
        display: true,
        anchor: 'end' as const,
        align: 'top' as const,
        color: '#475569',
        font: { weight: 'bold' as const, size: 12 },
        formatter: (value: number) => value
      },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        displayColors: false,
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { weight: 'bold' as const } } },
      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, border: { display: false } },
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
