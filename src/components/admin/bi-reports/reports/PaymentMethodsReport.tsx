import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportDataTable, ReportColumn } from "../components/ReportDataTable";
import { useExportContext } from "../layout/ReportsLayout";
import {
  Filter,
  CreditCard,
  Banknote,
  Smartphone,
  Wallet,
  MapPin,
  BarChart3,
  PieChart,
} from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePaymentMethods } from "@/hooks/use-payment-methods";

interface PaymentMethodData {
  id: string;
  payment_method: string;
  date: string;
  location: string;
  total_amount: number;
  transaction_count: number;
  average_amount: number;
}

interface PaymentMethodSummary {
  id: string;
  payment_method: string;
  total_amount: number;
  transaction_count: number;
  average_amount: number;
  percentage: number;
}

export function PaymentMethodsReport() {
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({
    location: "all",
  });

  // Export context for sharing data with layout
  const { setExportData, setReportName } = useExportContext();

  // Fetch locations for filter dropdown
  const { data: locations = [] } = useQuery({
    queryKey: ["locations-for-payment-methods-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .order("name");

      if (error) {
        console.error("Error fetching locations:", error);
        return [];
      }
      return data || [];
    },
  });
  // Fetch payment methods configuration
  const { paymentMethods = [] } = usePaymentMethods();
  // Fetch payment data from appointments with optimized query
  const { data: appointmentData, isLoading: appointmentLoading } = useQuery({
    queryKey: ["payment-methods-appointments", dateRange, filters],
    queryFn: async () => {
      const startDate = dateRange?.from || subDays(new Date(), 30);
      const endDate = dateRange?.to || new Date();
      let query = supabase
        .from("appointments")
        .select(
          `
          id,
          start_time,
          payment_method,
          location,
          total_price
        `
        )
        .gte("start_time", startOfDay(startDate).toISOString())
        .lte("start_time", endOfDay(endDate).toISOString())
        .eq("status", "completed");

      // Apply location filter
      if (filters.location && filters.location !== "all") {
        query = query.eq("location", filters.location);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching appointment data:", error);
        return [];
      }
      return (data || []).map((appointment) => ({
        id: appointment.id,
        payment_method: appointment.payment_method || "Unknown",
        date: format(new Date(appointment.start_time), "yyyy-MM-dd"),
        location: appointment.location || "Unknown",
        total_amount: appointment.total_price || 0,
      }));
    },
  });
  // Calculate payment method summaries and overall statistics in one pass
  const { paymentMethodSummaries, totalAmount, totalTransactions } = useMemo(() => {
    if (!appointmentData || appointmentData.length === 0) 
      return { paymentMethodSummaries: [], totalAmount: 0, totalTransactions: 0 };

    const summaryMap = new Map<string, { total_amount: number; transaction_count: number; }>();
    let overallTotal = 0;
    let overallCount = 0;

    // Aggregate data in a single pass
    appointmentData.forEach((item) => {
      const method = item.payment_method;
      const existing = summaryMap.get(method) || { total_amount: 0, transaction_count: 0 };
      
      const amount = item.total_amount;
      summaryMap.set(method, {
        total_amount: existing.total_amount + amount,
        transaction_count: existing.transaction_count + 1,
      });

      // Track overall totals
      overallTotal += amount;
      overallCount += 1;
    });

    // Create summary entries with calculated fields
    const summaries = Array.from(summaryMap.entries())
      .map(([method, data]) => ({
        id: method,
        payment_method: method,
        total_amount: data.total_amount,
        transaction_count: data.transaction_count,
        average_amount: data.transaction_count > 0 ? data.total_amount / data.transaction_count : 0,
        percentage: overallTotal > 0 ? (data.total_amount / overallTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total_amount - a.total_amount);

    return { 
      paymentMethodSummaries: summaries, 
      totalAmount: overallTotal, 
      totalTransactions: overallCount 
    };
  }, [appointmentData]);
  // Calculate day-wise data more efficiently
  const dayWiseData = useMemo(() => {
    if (!appointmentData || appointmentData.length === 0) return [];

    // Use a more efficient data structure to track both amount and count
    const dayMethodMap = new Map<string, Map<string, { amount: number; count: number }>>();

    // Process data in a single loop
    appointmentData.forEach((item) => {
      const date = item.date;
      const method = item.payment_method;
      const amount = item.total_amount;

      // Initialize date map if needed
      if (!dayMethodMap.has(date)) {
        dayMethodMap.set(date, new Map());
      }
      
      const methodMap = dayMethodMap.get(date)!;
      
      // Initialize or update method data
      if (!methodMap.has(method)) {
        methodMap.set(method, { amount, count: 1 });
      } else {
        const current = methodMap.get(method)!;
        methodMap.set(method, { 
          amount: current.amount + amount, 
          count: current.count + 1 
        });
      }
    });

    // Convert to result array
    const result: PaymentMethodData[] = [];

    dayMethodMap.forEach((methodMap, date) => {
      methodMap.forEach((data, method) => {
        result.push({
          id: `${date}-${method}`,
          payment_method: method,
          date,
          location: "Multiple",
          total_amount: data.amount,
          transaction_count: data.count,
          average_amount: data.count > 0 ? data.amount / data.count : 0,
        });
      });
    });

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointmentData]);

  // Payment method icon mapping
  const getPaymentMethodIcon = (method: string) => {
    const methodLower = method.toLowerCase();
    if (methodLower.includes("cash")) return Banknote;
    if (
      methodLower.includes("card") ||
      methodLower.includes("credit") ||
      methodLower.includes("debit")
    )
      return CreditCard;
    if (
      methodLower.includes("online") ||
      methodLower.includes("upi") ||
      methodLower.includes("digital")
    )
      return Smartphone;
    return Wallet;
  };

  // Filter handlers
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleFilterReset = () => {
    setFilters({
      location: "all",
    });
  };

  const activeFiltersCount = Object.values(filters).filter(
    (value) => value && value !== "all"
  ).length;  // Set up export data
  useEffect(() => {
    // Export payment method summaries for exports - the export context expects an array
    setExportData(paymentMethodSummaries);
    setReportName("payment-methods-report");
  }, [paymentMethodSummaries, setExportData, setReportName]);

  // Table columns for summary
  const summaryColumns: ReportColumn[] = [
    {
      key: "payment_method",
      label: "Payment Method",
      sortable: true,
      type: "text",
    },
    {
      key: "total_amount",
      label: "Total Amount",
      sortable: true,
      type: "currency",
    },
    {
      key: "transaction_count",
      label: "Transactions",
      sortable: true,
      type: "number",
    },
    {
      key: "average_amount",
      label: "Average Amount",
      sortable: true,
      type: "currency",
    },
    {
      key: "percentage",
      label: "Percentage",
      sortable: true,
      type: "percentage",
    },
  ];

  // Table columns for day-wise data
  const dayWiseColumns: ReportColumn[] = [
    { key: "date", label: "Date", sortable: true, type: "date" },
    {
      key: "payment_method",
      label: "Payment Method",
      sortable: true,
      type: "text",
    },
    { key: "total_amount", label: "Amount", sortable: true, type: "currency" },
    {
      key: "transaction_count",
      label: "Transactions",
      sortable: true,
      type: "number",
    },
    {
      key: "average_amount",
      label: "Average",
      sortable: true,
      type: "currency",
    },
  ];
  const isLoading = appointmentLoading;

  return (
    <div className="space-y-6">
      {/* Layout matching other reports */}
      <div className="space-y-4 sm:space-y-0">
        {/* Calendar and Filter aligned to the left */}
        <div className="flex items-center justify-start gap-3">
          {/* Calendar first */}
          <DateRangePicker
            dateRange={dateRange}
            onChange={setDateRange}
            isMobile={isMobile}
            align="center"
            useDialogOnDesktop={true}
            dialogWidth="w-[600px] max-w-[90vw]"
            popoverWidth="w-[740px]"
            compact={false}
          />

          {/* Filter button second - icon only on mobile, with text on desktop */}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setFiltersOpen(true)}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="default" className="ml-1 px-1.5 py-0.5 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>      {/* Consolidated Payment Methods Dashboard */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Payment Methods Summary</CardTitle>              <CardDescription className="mt-1">
                Showing {paymentMethodSummaries.length} payment methods with ₹{totalAmount.toLocaleString()} total from {totalTransactions} transactions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">              <Badge variant="outline" className="py-1">
                <BarChart3 className="h-3.5 w-3.5 mr-1" /> 
                Avg. transaction: ₹{totalTransactions > 0 ? (totalAmount / totalTransactions).toFixed(2) : "0.00"}
              </Badge>
              <Badge variant="outline" className="py-1">
                <PieChart className="h-3.5 w-3.5 mr-1" />
                {paymentMethodSummaries.length} methods
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>          {/* Top 3 payment methods in cards */}
          {paymentMethodSummaries.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
                {paymentMethodSummaries.slice(0, 3).map((summary) => {
                  const IconComponent = getPaymentMethodIcon(summary.payment_method);
                  return (
                    <Card key={summary.id} className="border-muted bg-muted/5">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{summary.payment_method}</h3>
                          <div className="text-lg font-bold">₹{summary.total_amount.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {summary.transaction_count} transactions • {summary.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {/* Simplified table of other payment methods if more than 3 exist */}
              {paymentMethodSummaries.length > 3 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Other Payment Methods</h4>
                  <div className="bg-muted/10 rounded-md p-3">
                    <ul className="space-y-2">
                      {paymentMethodSummaries.slice(3).map((summary) => {
                        const IconComponent = getPaymentMethodIcon(summary.payment_method);
                        return (
                          <li key={summary.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4 text-muted-foreground" />
                              <span>{summary.payment_method}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm">₹{summary.total_amount.toLocaleString()}</span>
                              <span className="text-xs text-muted-foreground">({summary.percentage.toFixed(1)}%)</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>      {/* Day-wise Data Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Day-wise Payment Methods Breakdown</CardTitle>
              <CardDescription className="mt-1">
                Daily distribution of payment methods over the selected date range
              </CardDescription>
            </div>
            <Badge variant="outline" className="py-1">
              {dayWiseData.length} entries
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ReportDataTable
            data={dayWiseData}
            columns={dayWiseColumns}
            title=""
            searchPlaceholder=""
            loading={isLoading}
            externalSearchTerm=""
            totalCount={dayWiseData.length}
          />
        </CardContent>
      </Card>

      {/* Filter Dialog */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">
              Filter Payment Methods Data
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Apply filters to refine your payment methods analysis
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-2 max-h-[50vh]">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Location</label>
              <Select
                value={filters.location}
                onValueChange={(value) => handleFilterChange("location", value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {location.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t mt-2">
            <Button
              variant="outline"
              onClick={handleFilterReset}
              className="flex-1 h-9"
            >
              Reset
            </Button>
            <Button
              onClick={() => setFiltersOpen(false)}
              className="flex-1 h-9"
            >
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
