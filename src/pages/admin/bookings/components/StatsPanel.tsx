
import React, { useEffect, useRef } from 'react';

interface Stat {
  label: string;
  value: number | string;
}

interface StatsPanelProps {
  stats: Stat[];
  onVisible?: () => void;
}

export function StatsPanel({ stats, onVisible }: StatsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            onVisible();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (panelRef.current) {
      observer.observe(panelRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [onVisible]);

  return (
    <div ref={panelRef} className="p-4 border-b bg-white flex space-x-4 overflow-x-auto">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white border rounded shadow-sm px-4 py-2 min-w-[150px]"
        >
          <div className="text-gray-500 text-sm">{stat.label}</div>
          <div className="text-xl font-bold">
            {stat.label === "Today's Revenue" || stat.label === "Revenue" 
              ? `₹${stat.value}`
              : stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
