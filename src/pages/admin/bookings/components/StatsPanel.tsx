
import React from 'react';

interface Stat {
  label: string;
  value: number | string;
  format?: 'currency' | 'number' | 'percentage';
}

interface StatsPanelProps {
  stats: Stat[];
  isLoading?: boolean;
}

export function StatsPanel({ stats, isLoading = false }: StatsPanelProps) {
  const formatValue = (stat: Stat) => {
    if (typeof stat.value === 'string') return stat.value;
    
    if (stat.format === 'currency') {
      return `₹${stat.value.toFixed(2)}`;
    } else if (stat.format === 'percentage') {
      return `${stat.value.toFixed(2)}%`;
    } else {
      return stat.value.toString();
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 border-b bg-white flex space-x-4 overflow-x-auto">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i}
            className="bg-white border rounded shadow-sm px-4 py-2 min-w-[150px] animate-pulse"
          >
            <div className="h-3 bg-gray-200 rounded mb-2 w-20"></div>
            <div className="h-5 bg-gray-300 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 border-b bg-white flex space-x-4 overflow-x-auto">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white border rounded shadow-sm px-4 py-2 min-w-[150px]"
        >
          <div className="text-gray-500 text-sm">{stat.label}</div>
          <div className="text-xl font-bold">
            {formatValue(stat)}
          </div>
        </div>
      ))}
    </div>
  );
}
