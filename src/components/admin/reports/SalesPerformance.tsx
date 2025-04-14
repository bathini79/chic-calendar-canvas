
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, ChartBar, BarChart2, PieChart, Coins } from "lucide-react";
import { SalesPerformanceTable } from './sales-performance/SalesPerformanceTable';
import { SalesPerformanceAnalytics } from './sales-performance/SalesPerformanceAnalytics';
import { ServiceCategoryPerformance } from './sales-performance/ServiceCategoryPerformance';
import { DateRangePicker } from './sales-performance/DateRangePicker';
import { EmployeeSelector } from './sales-performance/EmployeeSelector';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LoyaltyPerformance } from './sales-performance/LoyaltyPerformance';

type SalesPerformanceProps = {
  onBack: () => void;
};

export const SalesPerformance = ({ onBack }: SalesPerformanceProps) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"30" | "90" | "365" | "custom">("30");
  const [activeTab, setActiveTab] = useState<string>("report");
  const [activeSection, setActiveSection] = useState<string>("services");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-2xl font-bold">Sales Performance</h2>
        </div>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              <span>Services</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              <span>Service Categories</span>
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              <span>Loyalty Points</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <EmployeeSelector 
              value={selectedEmployeeId} 
              onValueChange={setSelectedEmployeeId} 
            />
            <DateRangePicker 
              value={dateRange} 
              onValueChange={setDateRange} 
            />
          </div>
        </div>

        <TabsContent value="services" className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="report" className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                <span>Report</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <ChartBar className="h-4 w-4" />
                <span>Analytics</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="report" className="space-y-4">
              <SalesPerformanceTable 
                employeeId={selectedEmployeeId}
                dateRange={dateRange}
              />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <SalesPerformanceAnalytics 
                employeeId={selectedEmployeeId}
                dateRange={dateRange}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <ServiceCategoryPerformance
            employeeId={selectedEmployeeId}
            dateRange={dateRange}
          />
        </TabsContent>

        <TabsContent value="loyalty" className="space-y-4">
          <LoyaltyPerformance
            employeeId={selectedEmployeeId}
            dateRange={dateRange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
