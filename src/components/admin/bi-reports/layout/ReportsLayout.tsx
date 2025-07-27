import React, { useState, createContext, useContext } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  BarChart, 
  Users, 
  TrendingUp, 
  Calendar, 
  Package, 
  Star,
  DollarSign,
  CreditCard,
  UserCheck,
  ArrowLeft,
  MoreHorizontal,
  ChevronDown,
  Download,
  FileText,
  FileSpreadsheet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SalesPerformanceAnalyticsReport } from "../reports/SalesPerformanceAnalyticsReport";
import { PaymentMethodsReport } from "../reports/PaymentMethods";
import { CustomerSalesReport } from "../reports/CustomerSalesReport";
import { SalesSummaryReport } from "../reports/SalesSummaryReport";
import { FinancialSummaryReport } from "../reports/FinancialSummaryReport";
import { StaffWagesSummaryReport } from "../reports/StaffWagesSummaryReport";
import { StaffCommissionsSummaryReport } from "../reports/StaffCommissionsSummaryReport";
import { StaffPayoutSummaryReport } from "../reports/StaffPayoutSummaryReport";

// Export utility functions
const exportToCSV = (data: any[], filename: string = 'export') => {
  if (!data || data.length === 0) {
    toast.error('No data to export');
    return;
  }
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  toast.success('CSV file downloaded successfully');
};

const exportToExcel = (data: any[], filename: string = 'export') => {
  // For now, we'll export as CSV since Excel export requires additional libraries
  // In production, you might want to use libraries like xlsx
  exportToCSV(data, filename);
  toast.success('Excel-compatible file downloaded');
};

const exportToPDF = (data: any[], filename: string = 'export') => {
  // For now, show a message that PDF export is not implemented
  // In production, you might want to use libraries like jsPDF  toast.info('PDF export feature coming soon');
};

// Context for sharing export data between layout and reports
interface ExportContextType {
  exportData: any[];
  setExportData: (data: any[]) => void;
  reportName: string;
  setReportName: (name: string) => void;
}

const ExportContext = createContext<ExportContextType | undefined>(undefined);

export const useExportContext = () => {
  const context = useContext(ExportContext);
  if (!context) {
    throw new Error('useExportContext must be used within ExportContext');
  }
  return context;
};

// Sales Reports - Phase 2 Implementation
const reports = [
  {
    id: "sales-performance", 
    title: "Sales Performance Analytics",
    description: "Service and employee performance analysis with visual charts",
    icon: TrendingUp,
    category: "Sales",
    component: SalesPerformanceAnalyticsReport
  },
  {
    id: "sales-summary",
    title: "Sales Summary Report",
    description: "Comprehensive sales data with advanced grouping by type, category, item, team, client, location, and time periods",
    icon: BarChart,
    category: "Sales",
    component: SalesSummaryReport
  },
  {
    id: "financial-summary",
    title: "Financial Summary Report",
    description: "Comprehensive financial data with sales, payments, and unpaid amounts",
    icon: DollarSign,
    category: "Finance",
    component: FinancialSummaryReport
  },
  {
    id: "payment-methods",
    title: "Payment Methods Report", 
    description: "Payment method analysis with revenue breakdown and transaction volume",
    icon: CreditCard,
    category: "Finance",
    component: PaymentMethodsReport
  },  {
    id: "customer-sales",
    title: "Customer Sales Report",
    description: "Customer segmentation with tier-based analysis and top customer identification",
    icon: UserCheck,
    category: "Clients",
    component: CustomerSalesReport
  },
  // Staff Reports
  {
    id: "staff-wages-summary",
    title: "Staff Wages Summary",
    description: "Detailed breakdown of staff wages, hours worked, and hourly rates",
    icon: Users,
    category: "Staff",
    component: StaffWagesSummaryReport
  },
  {
    id: "staff-commissions-summary",
    title: "Staff Commissions Summary",
    description: "Analysis of staff commissions and performance metrics",
    icon: Users,
    category: "Staff",
    component: StaffCommissionsSummaryReport
  },
  {
    id: "staff-payout-summary",
    title: "Staff Payout Summary",
    description: "Complete breakdown of staff payouts including wages, commissions, and adjustments",
    icon: Users,
    category: "Staff",
    component: StaffPayoutSummaryReport
  }
];

const tabs = [
  "All reports",
  "Sales", 
  "Finance",
  "Appointments",
  "Staff",
  "Clients", 
  "Inventory"
];

interface ReportsLayoutProps {
  className?: string;
}

export function ReportsLayout({ className }: ReportsLayoutProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("All reports");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  
  // Export context state
  const [exportData, setExportData] = useState<any[]>([]);
  const [reportName, setReportName] = useState<string>('');
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = selectedTab === "All reports" || report.category === selectedTab;
    
    return matchesSearch && matchesTab;
  });

  // Debug: Log filtered reports to check for duplicates
  console.log("Filtered reports:", filteredReports.map(r => ({ id: r.id, title: r.title })));

  // If a report is selected, render the specific report component
  if (selectedReport) {
    const report = reports.find(r => r.id === selectedReport);
    if (report) {
      const ReportComponent = report.component;
      return (        <div className={cn("min-h-screen bg-background", className)}>
          <div className="border-b bg-card px-6 py-4">            {/* Desktop: Back in first row, Mobile: Back and Hamburger in first row */}
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedReport(null)}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              {/* Mobile: Hamburger in first row */}
              {selectedReport === 'sales-performance' && (
                <div className="block sm:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => exportToCSV(exportData, reportName || 'report')}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Export as CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportToExcel(exportData, reportName || 'report')}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export as Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportToPDF(exportData, reportName || 'report')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export as PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>              {/* Desktop: Title and Options in second row, Mobile: Title only in second row */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{report.title}</h1>
                <p className="text-muted-foreground">{report.description}</p>
              </div>
              
              {/* Desktop: Options beside title in second row */}
              {selectedReport === 'sales-performance' && (
                <div className="hidden sm:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <span className="mr-2">Options</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => exportToCSV(exportData, reportName || 'report')}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Export as CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportToExcel(exportData, reportName || 'report')}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export as Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportToPDF(exportData, reportName || 'report')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export as PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>          </div>
          <div className="p-6">
            <ExportContext.Provider value={{ exportData, setExportData, reportName, setReportName }}>
              <ReportComponent />
            </ExportContext.Provider>
          </div>
        </div>
      );
    }
  }

  return (
    <div className={cn("min-h-screen bg-background", className)}>      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold hidden sm:block">Reporting and analytics</h1>
          <h1 className="text-2xl font-bold sm:hidden">Reports</h1>
          <p className="text-muted-foreground">
            Access all of your business reports. <span className="text-blue-600">Learn more</span>
          </p>
        </div>
        
        {/* Search */}
        <div className="mb-4">
          <div className="relative w-full max-w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by report name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <Button
              key={tab}
              variant={selectedTab === tab ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedTab(tab)}
              className={cn(
                "rounded-full",
                selectedTab === tab && "bg-black text-white hover:bg-black/90"
              )}
            >
              {tab}
            </Button>
          ))}
        </div>
      </div>      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredReports.map((report) => (
                <Card 
                  key={report.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedReport(report.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <report.icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{report.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {report.description}
                          </CardDescription>
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {report.category}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Star className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
