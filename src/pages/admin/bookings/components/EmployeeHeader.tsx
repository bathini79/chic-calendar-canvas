
import React from 'react';
import { Employee } from '../types';

interface EmployeeHeaderProps {
  employees: Employee[];
}

export function EmployeeHeader({ employees }: EmployeeHeaderProps) {
  return (
    <div className="flex">
      <div className="w-16 border-r" />
      {employees.map((emp: any) => (
        <div
          key={emp.id}
          className="flex-1 border-r flex items-center justify-center p-2"
        >
          <div className="flex flex-col items-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-bold text-white">
              {emp.avatar}
            </div>
            <div className="text-xs font-medium text-gray-700">
              {emp.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
