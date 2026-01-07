
import React from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  color: 'blue' | 'orange' | 'purple' | 'green';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color }) => {
  const colorMap = {
    blue: 'border-blue-200 bg-blue-50 text-blue-600',
    orange: 'border-orange-200 bg-orange-50 text-orange-600',
    purple: 'border-purple-200 bg-purple-50 text-purple-600',
    green: 'border-green-200 bg-green-50 text-green-600'
  };

  return (
    <div className={`p-6 rounded-2xl border-2 transition-all hover:-translate-y-1 hover:shadow-lg ${colorMap[color]}`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-2">{label}</p>
      <p className="text-4xl font-extrabold">{value}</p>
    </div>
  );
};

export default StatCard;
