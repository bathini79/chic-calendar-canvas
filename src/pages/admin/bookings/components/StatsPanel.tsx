
import React from 'react';

interface Stat {
  label: string;
  value: number;
}

interface StatsPanelProps {
  stats: Stat[];
}

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="p-4 border-b bg-white flex space-x-4 overflow-x-auto">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white border rounded shadow-sm px-4 py-2 min-w-[150px]"
        >
          <div className="text-gray-500 text-sm">{stat.label}</div>
          <div className="text-xl font-bold">
            {stat.label === "Today's Revenue"
              ? `$${stat.value}`
              : stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
