import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportsDataTable, TableColumn } from "../ReportsDataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  TrendingUp,
  Calendar,
  DollarSign,
  ArrowLeft,
  Download,
  RefreshCw,
  Filter,
  Eye,
} from "lucide-react";
import { format, subDays, subMonths } from "date-fns";

interface CustomerSegment {
  id: string;
  name: string;
  count: number;
  percentage: number;
  totalSpent: number;
  avgSpent: number;
  avgFrequency: number;
  lastVisit: string;
  segment: "VIP" | "Regular" | "Occasional" | "New" | "Churned";
  characteristics: string[];
}

interface CustomerProfileSegmentationProps {
  onBack?: () => void;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#d084d8'];

export function CustomerProfileSegmentation({ onBack }: CustomerProfileSegmentationProps) {
  const [dateRange, setDateRange] = useState("6months");
  const [selectedSegment, setSelectedSegment] = useState<string>("all");
  const [viewType, setViewType] = useState<"overview" | "detailed">("overview");

  // Mock data for Phase 1 - will be replaced with real queries
  const { data: segmentData, isLoading } = useQuery({
    queryKey: ["customer-segmentation", dateRange],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock segmentation data
      return [
        {
          id: "vip",
          name: "VIP Customers",
          count: 45,
          percentage: 15,
          totalSpent: 125000,
          avgSpent: 2778,
          avgFrequency: 8.2,
          lastVisit: "2024-12-07",
          segment: "VIP" as const,
          characteristics: ["High value", "Frequent visits", "Premium services", "Loyal"]
        },
        {
          id: "regular",
          name: "Regular Customers", 
          count: 120,
          percentage: 40,
          totalSpent: 180000,
          avgSpent: 1500,
          avgFrequency: 4.5,
          lastVisit: "2024-12-06",
          segment: "Regular" as const,
          characteristics: ["Consistent visits", "Mixed services", "Price conscious"]
        },
        {
          id: "occasional",
          name: "Occasional Customers",
          count: 85,
          percentage: 28,
          totalSpent: 68000,
          avgSpent: 800,
          avgFrequency: 2.1,
          lastVisit: "2024-12-01",
          segment: "Occasional" as const,
          characteristics: ["Sporadic visits", "Basic services", "Budget friendly"]
        },
        {
          id: "new",
          name: "New Customers",
          count: 32,
          percentage: 11,
          totalSpent: 19200,
          avgSpent: 600,
          avgFrequency: 1.2,
          lastVisit: "2024-12-05",
          segment: "New" as const,
          characteristics: ["First time", "Trial services", "Potential growth"]
        },
        {
          id: "churned",
          name: "Churned Customers",
          count: 18,
          percentage: 6,
          totalSpent: 21600,
          avgSpent: 1200,
          avgFrequency: 0,
          lastVisit: "2024-10-15",
          segment: "Churned" as const,
          characteristics: ["No recent visits", "Previous regulars", "Re-engagement needed"]
        }
      ] as CustomerSegment[];
    }
  });

  // Prepare chart data
  const pieChartData = useMemo(() => {
    if (!segmentData) return [];
    return segmentData.map(segment => ({
      name: segment.name,
      value: segment.count,
      percentage: segment.percentage,
      fill: COLORS[segmentData.indexOf(segment) % COLORS.length]
    }));
  }, [segmentData]);

  const barChartData = useMemo(() => {
    if (!segmentData) return [];
    return segmentData.map(segment => ({
      segment: segment.name.replace(" Customers", ""),
      spent: segment.totalSpent,
      frequency: segment.avgFrequency,
      count: segment.count
    }));
  }, [segmentData]);

  // Table columns for detailed view
  const tableColumns: TableColumn[] = [
    {
      id: "segment",
      label: "Segment",
      key: "name",
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: COLORS[segmentData?.indexOf(row) % COLORS.length || 0] }}
          />
          <div>
            <div className="font-medium">{value}</div>
            <Badge 
              variant={
                row.segment === "VIP" ? "default" :
                row.segment === "Regular" ? "secondary" :
                row.segment === "New" ? "outline" :
                "destructive"
              }
              className="text-xs"
            >
              {row.segment}
            </Badge>
          </div>
        </div>
      )
    },
    {
      id: "count",
      label: "Customer Count",
      key: "count",
      sortable: true,
      type: "number",
      align: "right"
    },
    {
      id: "percentage",
      label: "% of Total",
      key: "percentage",
      sortable: true,
      align: "right",
      render: (value) => `${value}%`
    },
    {
      id: "totalSpent",
      label: "Total Spent",
      key: "totalSpent", 
      sortable: true,
      type: "currency",
      align: "right"
    },
    {
      id: "avgSpent",
      label: "Avg Spent",
      key: "avgSpent",
      sortable: true,
      type: "currency",
      align: "right"
    },
    {
      id: "avgFrequency",
      label: "Avg Frequency",
      key: "avgFrequency",
      sortable: true,
      align: "right",
      render: (value) => `${value.toFixed(1)} visits/month`
    },
    {
      id: "lastVisit",
      label: "Last Visit",
      key: "lastVisit",
      sortable: true,
      type: "date",
      align: "center"
    },
    {
      id: "characteristics",
      label: "Key Characteristics",
      key: "characteristics",
      render: (value) => (
        <div className="flex flex-wrap gap-1">
          {value.slice(0, 2).map((char: string, index: number) => (
            <Badge key={index} variant="outline" className="text-xs">
              {char}
            </Badge>
          ))}
          {value.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{value.length - 2} more
            </Badge>
          )}
        </div>
      )
    }
  ];

  const filteredData = useMemo(() => {
    if (!segmentData) return [];
    if (selectedSegment === "all") return segmentData;
    return segmentData.filter(segment => segment.id === selectedSegment);
  }, [segmentData, selectedSegment]);

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    console.log(`Exporting customer segmentation data as ${format}...`);
  };

  const handleRefresh = () => {
    console.log("Refreshing customer segmentation data...");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-semibold">Customer Profile Segmentation</h1>
            <p className="text-sm text-muted-foreground">
              Analyze customer segments based on behavior, spending, and engagement patterns
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={viewType} onValueChange={(value) => setViewType(value as "overview" | "detailed")}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {segmentData?.reduce((sum, segment) => sum + segment.count, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active customer base
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{((segmentData?.reduce((sum, segment) => sum + segment.totalSpent, 0) || 0) / 1000).toFixed(0)}K
            </div>
            <p className="text-xs text-muted-foreground">
              From segmented customers
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Customer Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{Math.round((segmentData?.reduce((sum, segment) => sum + segment.totalSpent, 0) || 0) / (segmentData?.reduce((sum, segment) => sum + segment.count, 0) || 1))}
            </div>
            <p className="text-xs text-muted-foreground">
              Average per customer
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP Percentage</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {segmentData?.find(s => s.segment === "VIP")?.percentage || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              High-value customers
            </p>
          </CardContent>
        </Card>
      </div>

      {viewType === "overview" ? (
        /* Charts View */
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Customer Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Segment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="segment" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === "spent" ? `₹${value?.toLocaleString()}` : value,
                        name === "spent" ? "Revenue" : "Avg Frequency"
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="spent" fill="#8884d8" name="Total Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Detailed Table View */
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedSegment} onValueChange={setSelectedSegment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by segment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                {segmentData?.map(segment => (
                  <SelectItem key={segment.id} value={segment.id}>
                    {segment.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ReportsDataTable
            title="Customer Segment Details"
            description={`Detailed analysis of ${filteredData.length} customer segment${filteredData.length !== 1 ? 's' : ''}`}
            columns={tableColumns}
            data={filteredData}
            loading={isLoading}
            searchable={false}
            filterable={false}
            exportable={true}
            pagination={true}
            pageSize={25}
            onExport={handleExport}
            onRefresh={handleRefresh}
            emptyMessage="No customer segments match your criteria"
            showFooter={true}
            footerData={{
              name: "Total",
              count: filteredData.reduce((sum, segment) => sum + segment.count, 0),
              totalSpent: filteredData.reduce((sum, segment) => sum + segment.totalSpent, 0),
              avgSpent: filteredData.reduce((sum, segment) => sum + segment.avgSpent, 0) / filteredData.length,
              avgFrequency: filteredData.reduce((sum, segment) => sum + segment.avgFrequency, 0) / filteredData.length,
            }}
          />
        </div>
      )}
    </div>
  );
}
