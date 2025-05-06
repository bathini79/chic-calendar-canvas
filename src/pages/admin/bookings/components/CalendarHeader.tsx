import React from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from './Icons';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CalendarHeaderProps {
  currentDate: Date;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  className?: string; // Add optional className prop
}

export function CalendarHeader({ currentDate, onToday, onPrevious, onNext, className }: CalendarHeaderProps) {
  function formatCurrentDate(date: Date) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayOfWeek = days[date.getDay()];
    const dayOfMonth = date.getDate();
    const month = months[date.getMonth()];
    return `${dayOfWeek} ${dayOfMonth} ${month}`;
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <button
        onClick={onToday}
        className="px-4 py-1 border rounded-full hover:bg-gray-100 text-sm"
      >
        Today
      </button>
      <button
        onClick={onPrevious}
        className="px-3 py-1 border rounded-full hover:bg-gray-100 flex items-center justify-center"
      >
        <ArrowLeftIcon />
      </button>
      <div className="px-6 py-1 border rounded-full text-sm flex items-center justify-center">
        {formatCurrentDate(currentDate)}
      </div>
      <button
        onClick={onNext}
        className="px-3 py-1 border rounded-full hover:bg-gray-100 flex items-center justify-center"
      >
        <ArrowRightIcon />
      </button>
    </div>
  );
}
