import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  subMonths,
  isEqual,
} from "date-fns";
import type { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "@/lib/toast";
import { Filter } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { useIsMobile } from "@/hooks/use-mobile";

// Group By options type
type GroupByOption =
  | "payment_method"
  | "location"
  | "date"
  | "type"
  | "day"
  | "month"
  | "quarter"
  | "year";

interface SummaryData {
  id: string;
  group_by_value: string;
  group_by_type: GroupByOption;
  gross_sales: number;
  discounts: number;
  refunds_returns: number;
  net_sales: number;
  taxes: number;
  total_sales: number;
  gift_card_sales: number;
  service_charges: number;
  tips: number;
  net_other_sales: number;
  tax_on_other_sales: number;
  total_other_sales: number;
  total_amount: number;
  payments_in_period: number;
  unpaid_amount: number;
  upfront_payments: number;
  redemptions: number;
}

interface FinancialData {
  id: string;
  date: string;
  location: string;
  payment_method: string;
  type: "service" | "membership" | "item" | "gift_card" | "tip";
  gross_amount: number;
  discount_amount: number;
  coupon_amount?: number;
  points_discount_amount?: number;
  membership_discount?: number;
  manual_discount?: number;
  referral_wallet_redeemed?: number;
  referral_wallet_discount_amount?: number;
  refund_amount: number;
  tax_amount: number;
  net_amount: number;
  total_amount: number;
  status: "paid" | "unpaid";
  payment_type?: string;
  is_membership_discount?: boolean;
  membership_id?: string;
}

function FinancialSummaryReport() {
  const isMobile = useIsMobile();  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(), // Default to today
    to: new Date(),
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupBy, setGroupBy] = useState<GroupByOption>("type");
  const [filters, setFilters] = useState<Record<string, any>>({
    location: "all",
    payment_method: "all",
    type: "all",
  });

  // Hook to get payment methods
  const {
    paymentMethods,
    fetchPaymentMethods,
    isLoading: paymentMethodsLoading,
  } = usePaymentMethods();

  // Export context for sharing data with layout
  const { setExportData, setReportName } = useExportContext();

  // Fetch locations for filter dropdown
  const { data: locations = [] } = useQuery({
    queryKey: ["locations-for-financial-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .order("name");

      if (error) {
        console.error("Error fetching locations:", error);
        return [];
      }

      return data.map((loc) => ({
        id: loc.id,
        name: loc.name,
      }));
    },
  });

  // Helper function to fetch appointment sales
  const fetchAppointmentSales = async (
    startDate: Date,
    endDate: Date
  ): Promise<FinancialData[]> => {
    let query = supabase
      .from("appointments")
      .select(
        `        id,
        start_time,
        total_price,
        tax_amount,
        discount_value,
        membership_discount,
        coupon_amount,
        points_discount_amount,
        referral_wallet_redeemed,
        referral_wallet_discount_amount,
        location,
        payment_method,
        refund_reason,
        transaction_type,
        status,
        membership_id
      `
      )
      .gte("start_time", startOfDay(startDate).toISOString())
      .lte("start_time", endOfDay(endDate).toISOString());

    // Apply filters
    if (filters.location && filters.location !== "all") {
      query = query.eq("location", filters.location);
    }
    if (filters.payment_method && filters.payment_method !== "all") {
      query = query.eq("payment_method", filters.payment_method);
    }

    const { data, error } = await query;

    if (error || !Array.isArray(data)) {
      console.log("Appointment sales error:", error);
      return [];
    } // Process data
    return data.map((appointment: any) => {
      const couponAmount = appointment.coupon_amount || 0;
      const membershipDiscount = appointment.membership_discount || 0;
      const pointsDiscount = appointment.points_discount_amount || 0;
      const referralWalletRedeemed = appointment.referral_wallet_redeemed || 0;
      const referralWalletDiscount =
        appointment.referral_wallet_discount_amount || 0;
      const discountValue = appointment.discount_value || 0;

      // For referral wallet, use either redeemed or discount amount, but not both to avoid double counting
      const referralWalletAmount =
        referralWalletRedeemed || referralWalletDiscount;
      const totalDiscounts =
        discountValue +
        membershipDiscount +
        couponAmount +
        pointsDiscount +
        referralWalletAmount;

      const grossAmount =
        appointment.total_price +
        totalDiscounts -
        (appointment.tax_amount || 0);
      const netAmount = grossAmount - totalDiscounts;
      const refundAmount =
        appointment.transaction_type === "refund" ? grossAmount : 0;
      return {
        id: appointment.id,
        date: appointment.start_time,
        location: appointment.location || "Unknown Location",
        payment_method: appointment.payment_method || "Unknown",
        type: "service",
        gross_amount: grossAmount,
        discount_amount: totalDiscounts,
        coupon_amount: couponAmount,
        points_discount_amount: pointsDiscount,
        membership_discount: membershipDiscount,
        manual_discount: discountValue, // Using discount_value as manual_discount
        referral_wallet_redeemed: referralWalletRedeemed,
        referral_wallet_discount_amount: referralWalletDiscount,
        refund_amount: refundAmount,
        tax_amount: appointment.tax_amount || 0,
        net_amount: netAmount,
        total_amount: appointment.total_price || 0,
        status: ["completed", "refunded", "partially_refunded"].includes(
          appointment.status
        )
          ? "paid"
          : "unpaid",
        is_membership_discount: appointment.membership_discount ? true : false, // Derive from membership_discount
        membership_id: appointment.membership_id,
      };
    });
  };

  // Helper function to fetch membership sales
  const fetchMembershipSales = async (
    startDate: Date,
    endDate: Date
  ): Promise<FinancialData[]> => {
    let query = supabase
      .from("membership_sales")
      .select(
        `
        id,
        sale_date,
        total_amount,
        amount,
        tax_amount,
        location_id,
        payment_method,
        status
      `
      )
      .gte("sale_date", startOfDay(startDate).toISOString())
      .lte("sale_date", endOfDay(endDate).toISOString());

    // Apply filters
    if (filters.location && filters.location !== "all") {
      query = query.eq("location_id", filters.location);
    }
    if (filters.payment_method && filters.payment_method !== "all") {
      query = query.eq("payment_method", filters.payment_method);
    }

    const { data, error } = await query;

    if (error) {
      console.log("Membership sales error:", error);
      return []; // Return empty array if there's an error
    }

    // Process data
    return (data || [])
      .filter(
        (sale: any) =>
          sale &&
          typeof sale === "object" &&
          !("code" in sale) && // Exclude error objects
          "id" in sale &&
          "sale_date" in sale &&
          "status" in sale // Ensure 'status' exists
      )
      .map((sale: any) => {
        const grossAmount = sale.amount || 0;
        const taxAmount = sale.tax_amount || 0;
        const totalAmount = sale.total_amount || 0;
        const discountAmount = Math.max(
          0,
          grossAmount - totalAmount + taxAmount
        );

        return {
          id: sale.id,
          date: sale.sale_date,
          location: sale.location_id || "Unknown Location",
          payment_method: sale.payment_method || "Unknown",
          type: "membership",
          gross_amount: grossAmount,
          discount_amount: discountAmount,
          refund_amount: 0, // No refunds for memberships in this implementation
          tax_amount: taxAmount,
          net_amount: grossAmount - discountAmount,
          total_amount: totalAmount,
          status:
            sale.status === "completed" || sale.status === "refunded"
              ? "paid"
              : "unpaid",
        };
      });
  };
  // Helper function to fetch item sales
  const fetchItemSales = async (
    startDate: Date,
    endDate: Date
  ): Promise<FinancialData[]> => {
    try {
      // Use direct query instead of RPC
      // Using type casting because item_sales may not be in Supabase schema types
      const { data, error } = await (supabase as any)
        .from("item_sales")
        .select(
          `
          id,
          sale_date,
          total_amount,
          discount_value,
          tax_amount,
          final_amount,
          location_id,
          payment_method,
          status
        `
        )
        .gte("sale_date", startOfDay(startDate).toISOString())
        .lte("sale_date", endOfDay(endDate).toISOString());

      if (error) {
        console.log("Item sales error:", error);
        return [];
      }

      return (data || []).map((sale) => ({
        id: sale.id,
        date: sale.sale_date,
        location: sale.location_id || "Unknown Location",
        payment_method: sale.payment_method || "Unknown",
        type: "item",
        gross_amount: Number(sale.total_amount) || 0,
        discount_amount: Number(sale.discount_value) || 0,
        refund_amount: 0, // No refunds in this implementation yet
        tax_amount: Number(sale.tax_amount) || 0,
        net_amount:
          Number(sale.total_amount) - Number(sale.discount_value) || 0,
        total_amount: Number(sale.final_amount) || 0,
        status:
          sale.status === "completed" || sale.status === "refunded"
            ? "paid"
            : "unpaid",
      }));
    } catch (error) {
      console.log("Item sales fetch error:", error);
      return [];
    }
  };

  // Fetch all financial data
  const { data: rawFinancialData, isLoading } = useQuery({
    queryKey: ["financial-summary", dateRange, filters],
    queryFn: async () => {
      const startDate = dateRange?.from || subMonths(new Date(), 6);
      const endDate = dateRange?.to || new Date();

      // Fetch service sales data
      const appointmentData = await fetchAppointmentSales(startDate, endDate);

      // Fetch membership sales data
      const membershipData = await fetchMembershipSales(startDate, endDate);

      // Fetch item sales data
      const itemData = await fetchItemSales(startDate, endDate);

      // Combine all financial data
      const allFinancialData: FinancialData[] = [
        ...appointmentData,
        ...membershipData,
        ...itemData,
      ];

      return allFinancialData;
    },
  });
  // Use raw financial data directly from the query
  const financialData = useMemo(() => {
    console.log("Financial data updated:", dateRange?.from, dateRange?.to);
    return rawFinancialData || [];
  }, [rawFinancialData, dateRange]);

  // Summarize financial data by grouping
  const summarizedData = useMemo(() => {
    const groups = new Map<
      string,
      {
        gross_sales: number;
        discounts: number;
        refunds_returns: number;
        net_sales: number;
        taxes: number;
        total_sales: number;
        gift_card_sales: number;
        service_charges: number;
        tips: number;
        net_other_sales: number;
        tax_on_other_sales: number;
        total_other_sales: number;
        total_amount: number;
        payments_in_period: number;
        unpaid_amount: number;
      }
    >();

    financialData.forEach((item) => {
      let groupKey: string;
      let groupValue: string;

      switch (groupBy) {
        case "type":
          groupKey = item.type;
          groupValue = item.type.charAt(0).toUpperCase() + item.type.slice(1);
          break;
        case "payment_method":
          groupKey = item.payment_method;
          groupValue = item.payment_method;
          break;
        case "location":
          groupKey = item.location;
          groupValue = item.location;
          break;
        case "day":
          const day = format(new Date(item.date), "yyyy-MM-dd");
          groupKey = day;
          groupValue = day;
          break;
        case "month":
          const month = format(new Date(item.date), "yyyy-MM");
          groupKey = month;
          groupValue = month;
          break;
        case "quarter":
          const quarter = `Q${Math.ceil(
            (new Date(item.date).getMonth() + 1) / 3
          )} ${new Date(item.date).getFullYear()}`;
          groupKey = quarter;
          groupValue = quarter;
          break;
        case "year":
          const year = new Date(item.date).getFullYear().toString();
          groupKey = year;
          groupValue = year;
          break;
        default:
          groupKey = "Unknown";
          groupValue = "Unknown";
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          gross_sales: 0,
          discounts: 0,
          refunds_returns: 0,
          net_sales: 0,
          taxes: 0,
          total_sales: 0,
          gift_card_sales: 0,
          service_charges: 0,
          tips: 0,
          net_other_sales: 0,
          tax_on_other_sales: 0,
          total_other_sales: 0,
          total_amount: 0,
          payments_in_period: 0,
          unpaid_amount: 0,
        });
      }

      const group = groups.get(groupKey)!;
      group.gross_sales += item.gross_amount;
      group.discounts += item.discount_amount;
      group.refunds_returns += item.refund_amount;
      group.net_sales += item.net_amount;
      group.taxes += item.tax_amount;
      group.total_sales += item.total_amount;

      // Additional categorization for special types
      if (item.type === "gift_card") {
        group.gift_card_sales += item.total_amount;
      } else if (item.type === "tip") {
        group.tips += item.total_amount;
      }

      // Track payments
      if (item.status === "paid") {
        group.payments_in_period += item.total_amount;
      } else {
        group.unpaid_amount += item.total_amount;
      }

      // Total amount for all transaction types
      group.total_amount += item.total_amount;
    });

    return Array.from(groups.entries()).map(([key, data]) => ({
      id: key,
      group_by_value: key,
      group_by_type: groupBy,
      ...data,
      total_other_sales:
        data.gift_card_sales + data.service_charges + data.tips,
      net_other_sales: data.gift_card_sales + data.service_charges + data.tips,
    }));
  }, [financialData, groupBy]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return summarizedData;

    return summarizedData.filter((item) =>
      item.group_by_value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [summarizedData, searchTerm]);

  // Helper function to get group by label
  const getGroupByLabel = (option: GroupByOption): string => {
    const labels: Record<GroupByOption, string> = {
      type: "Type",
      payment_method: "Payment Method",
      location: "Location",
      date: "Date",
      day: "Day",
      month: "Month",
      quarter: "Quarter",
      year: "Year",
    };
    return labels[option] || option;
  }; // Fetch payment methods on component mount only
  useEffect(() => {
    fetchPaymentMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up export data
  useEffect(() => {
    setExportData(filteredData);
    setReportName("financial-summary");
  }, [filteredData, setExportData, setReportName]);
  // Define columns for any data table views
  const summaryColumns: ReportColumn[] = [
    {
      key: "group_by_value",
      label: getGroupByLabel(groupBy),
      sortable: true,
      type: "text",
    },
    {
      key: "completed_bookings",
      label: "Completed Bookings",
      sortable: true,
      type: "number",
    },
    {
      key: "services_revenue",
      label: "Services Revenue",
      sortable: true,
      type: "currency",
    },
    {
      key: "products_revenue",
      label: "Products Revenue",
      sortable: true,
      type: "currency",
    },
    {
      key: "total_revenue",
      label: "Total Revenue",
      sortable: true,
      type: "currency",
    },
    { key: "cash_payments", label: "Cash", sortable: true, type: "currency" },
    { key: "card_payments", label: "Card", sortable: true, type: "currency" },
    { key: "upi_payments", label: "UPI", sortable: true, type: "currency" },
    {
      key: "total_payments",
      label: "Total Payments",
      sortable: true,
      type: "currency",
    },
  ]; // No period options array or handler needed - using DateRangePicker component

  // Filter handlers
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleFilterReset = () => {
    setFilters({
      location: "all",
      payment_method: "all",
      type: "all",
    });
    setDateRange({ from: subDays(new Date(), 30), to: new Date() });
  };

  const activeFiltersCount = Object.values(filters).filter(
    (value) => value && value !== "all"
  ).length; // Format currency values
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };
  // Fetch booking status counts with a separate query to get more accurate counts
  const { data: bookingCounts } = useQuery({
    queryKey: ["booking-counts", dateRange, filters],
    queryFn: async () => {
      const startDate = dateRange?.from || subDays(new Date(), 30);
      const endDate = dateRange?.to || new Date();

      let query = supabase
        .from("appointments")
        .select("status", { count: "exact", head: false })
        .gte("start_time", startOfDay(startDate).toISOString())
        .lte("start_time", endOfDay(endDate).toISOString());

      if (filters.location && filters.location !== "all") {
        query = query.eq("location", filters.location);
      }

      const { data, error } = await query;

      if (error) {
        console.log("Booking counts error:", error);
        return {
          completed: 0,
          canceled: 0,
          voided: 0,
          pending: 0,
        };
      }
      // Match the exact status values from your schema (appointment_status enum)
      return {
        completed: data.filter((item) => item.status === "completed").length,
        canceled: data.filter((item) =>
          ["canceled", "refunded", "partially_refunded", "noshow"].includes(
            item.status || ""
          )
        ).length,
        voided: data.filter((item) => item.status === "voided").length,
        pending: data.filter((item) =>
          ["pending", "confirmed", "inprogress", "booked"].includes(
            item.status || ""
          )
        ).length,
      };
    },
  }); // Calculate summary data totals based on the actual financial data
  const summaryTotals = useMemo(() => {
    // Initialize with default values
    const totals = {
      // Bookings - will be overridden by the bookingCounts query
      completed_bookings: bookingCounts?.completed || 0,
      cancelled_bookings: bookingCounts?.canceled || 0, // Fix spelling to match the bookingCounts object
      voided_bookings: bookingCounts?.voided || 0,
      pending_bookings: bookingCounts?.pending || 0,
      // Products & Sales
      products_sold: 0,
      gift_cards_sold: 0,
      memberships_sold: 0,

      // Revenue
      services_revenue: 0,
      products_revenue: 0,
      gift_cards_revenue: 0,
      memberships_revenue: 0,

      // Gross and Net
      gross_sales: 0,
      net_sales: 0,

      // Discounts
      coupon_discounts: 0,
      loyalty_points_redeemed: 0,
      referral_wallet_redeemed: 0,
      membership_discounts: 0,
      manual_discounts: 0,

      // Taxes
      total_tax: 0,

      // Payment Methods
      payment_methods: {} as Record<string, number>,

      // Other
      total_outstanding_balance: 0,
      tips: 0,
      total_revenue: 0,
    };
    // Calculate revenue and counts from financial data
    financialData.forEach((item) => {
      // Track gross sales and net sales
      totals.gross_sales += item.gross_amount;
      totals.net_sales += item.net_amount;
      // Track discounts by type
      if (item.coupon_amount) totals.coupon_discounts += item.coupon_amount;
      if (item.points_discount_amount)
        totals.loyalty_points_redeemed += item.points_discount_amount;
      if (item.referral_wallet_redeemed)
        totals.referral_wallet_redeemed += item.referral_wallet_redeemed;
      // Using referral_wallet_discount_amount as an alternative if referral_wallet_redeemed is not present
      if (
        !item.referral_wallet_redeemed &&
        item.referral_wallet_discount_amount
      ) {
        totals.referral_wallet_redeemed += item.referral_wallet_discount_amount;
      }
      if (item.membership_discount)
        totals.membership_discounts += item.membership_discount;
      if (item.manual_discount) totals.manual_discounts += item.manual_discount; // Using discount_value as manual_discount

      // Track taxes
      totals.total_tax += item.tax_amount;

      // Calculate revenue by type
      switch (item.type) {
        case "service":
          totals.services_revenue += item.total_amount;
          break;
        case "item":
          totals.products_revenue += item.total_amount;
          totals.products_sold++;
          break;
        case "membership":
          totals.memberships_revenue += item.total_amount;
          totals.memberships_sold++;
          break;
        case "gift_card":
          // Tracking gift cards separately
          totals.gift_cards_revenue += item.total_amount;
          totals.gift_cards_sold++;
          break;
        case "tip":
          totals.tips += item.total_amount;
          break;
        default:
          // For any other types we might add in the future
          break;
      }

      // Calculate by payment method
      const paymentMethodName = item.payment_method
        ? item.payment_method.toLowerCase()
        : "unknown";

      // Check if we already have this payment method in our totals
      if (!totals.payment_methods[paymentMethodName]) {
        totals.payment_methods[paymentMethodName] = 0;
      }

      // Add the amount to the corresponding payment method
      totals.payment_methods[paymentMethodName] += item.total_amount;

      // For outstanding balance, simply use the unpaid status
      if (item.status === "unpaid") {
        totals.total_outstanding_balance += item.total_amount;
      }

      // Add to total revenue (includes both paid and unpaid amounts)
      totals.total_revenue += item.total_amount;
    });

    return totals;
  }, [financialData, bookingCounts, filters]);
  // Calculate sales breakdown from financial data
  const salesBreakdown = useMemo(() => {
    const tips = summarizedData.reduce((sum, item) => sum + item.tips, 0);

    return {
      tips,
    };
  }, [summarizedData]); // Calculate payments breakdown from financial data
  const paymentsBreakdown = useMemo(() => {
    // Calculate redemptions from financial data
    let giftCardRedemptions = 0;
    let membershipRedemptions = 0;
    let loyaltyPointsRedeemed = 0;
    // Initialize referral wallet redemptions
    let referralWalletRedeemed = 0;
    let couponDiscounts = 0;
    let manualDiscounts = 0;

    financialData.forEach((item) => {
      // Check for different types of redemptions
      // Since payment_type doesn't exist in appointments, rely only on payment_method
      if (
        item.payment_method &&
        item.payment_method.toLowerCase().includes("gift")
      ) {
        giftCardRedemptions += item.total_amount;
      } // If there is a membership discount and membership_id, count it as a membership redemption
      if (item.membership_discount && item.membership_id) {
        // Track membership discounts
        membershipRedemptions += item.membership_discount;
      }

      // Track loyalty points redemptions
      if (item.points_discount_amount) {
        loyaltyPointsRedeemed += item.points_discount_amount;
      } // Track referral wallet redemptions and discounts
      if (item.referral_wallet_redeemed) {
        referralWalletRedeemed += item.referral_wallet_redeemed;
      }
      // Using referral_wallet_discount_amount as an alternative if referral_wallet_redeemed is not present
      else if (item.referral_wallet_discount_amount) {
        referralWalletRedeemed += item.referral_wallet_discount_amount;
      }

      // Track coupon discounts
      if (item.coupon_amount) {
        couponDiscounts += item.coupon_amount;
      }
      // Track manual discounts (using discount_value)
      if (item.manual_discount) {
        manualDiscounts += item.manual_discount;
      }
    });
    // Calculate total redemptions
    const totalRedemptions =
      giftCardRedemptions +
      membershipRedemptions +
      loyaltyPointsRedeemed +
      referralWalletRedeemed;

    // Calculate total discounts
    const totalDiscounts =
      couponDiscounts +
      manualDiscounts +
      membershipRedemptions +
      loyaltyPointsRedeemed +
      referralWalletRedeemed;
    return {
      gift_card_redemption: giftCardRedemptions,
      membership_redemption: membershipRedemptions,
      loyalty_points_redeemed: loyaltyPointsRedeemed,
      referral_wallet_redeemed: referralWalletRedeemed,
      coupon_discounts: couponDiscounts,
      manual_discounts: manualDiscounts,
      total_redemptions: totalRedemptions,
      total_discounts: totalDiscounts,
    };
  }, [financialData]);  return (
    <div className="space-y-6">
      {/* Layout matching SalesPerformanceAnalyticsReport */}
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
      </div>{" "}
      {/* Financial Summary Cards */}{" "}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card className="overflow-hidden">
          <CardContent className="p-5 flex flex-col">
            <span className="text-sm font-medium text-muted-foreground mb-1">
              Gross Sales
            </span>
            <div className="flex items-center">
              <span className="text-2xl font-bold">
                {isLoading
                  ? "Loading..."
                  : formatCurrency(summaryTotals.gross_sales)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-5 flex flex-col">
            <span className="text-sm font-medium text-muted-foreground mb-1">
              Net Sales
            </span>
            <div className="flex items-center">
              <span className="text-2xl font-bold">
                {isLoading
                  ? "Loading..."
                  : formatCurrency(summaryTotals.net_sales)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-5 flex flex-col">
            <span className="text-sm font-medium text-muted-foreground mb-1">
              Total Revenue
            </span>
            <div className="flex items-center">
              <span className="text-2xl font-bold">
                {isLoading
                  ? "Loading..."
                  : formatCurrency(summaryTotals.total_revenue)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Main Summary Table */}{" "}
      <Card className="overflow-hidden">
        <CardHeader className="py-4 px-5 border-b bg-muted/40">
          <CardTitle className="text-lg font-medium">Sales Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <p>Loading sales data...</p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                      Item
                    </th>
                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {" "}
                  <tr className="border-b bg-muted/20">
                    <td colSpan={2} className="px-5 py-3 font-medium">
                      Bookings
                    </td>
                  </tr>{" "}
                  <tr>
                    <td className="px-5 py-2.5">Completed Bookings</td>
                    <td className="px-5 py-2.5 text-right">
                      {bookingCounts?.completed || 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-2.5">Cancelled Bookings</td>
                    <td className="px-5 py-2.5 text-right">
                      {bookingCounts?.canceled || 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-2.5">Voided Bookings</td>
                    <td className="px-5 py-2.5 text-right">
                      {bookingCounts?.voided || 0}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-5 py-2.5">Pending Bookings</td>
                    <td className="px-5 py-2.5 text-right">
                      {bookingCounts?.pending || 0}
                    </td>
                  </tr>
                  <tr className="border-b bg-muted/20">
                    <td colSpan={2} className="px-5 py-3 font-medium">
                      Products
                    </td>
                  </tr>{" "}
                  <tr>
                    <td className="px-5 py-2.5">Products Sold</td>
                    <td className="px-5 py-2.5 text-right">
                      {summaryTotals.products_sold}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-2.5">Gift Cards Sold</td>
                    <td className="px-5 py-2.5 text-right">
                      {summaryTotals.gift_cards_sold}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-5 py-2.5">Memberships Sold</td>
                    <td className="px-5 py-2.5 text-right">
                      {summaryTotals.memberships_sold}
                    </td>
                  </tr>{" "}
                  <tr className="border-b bg-muted/20">
                    <td colSpan={2} className="px-5 py-3 font-medium">
                      Financial Metrics
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-2.5">Gross Sales</td>
                    <td className="px-5 py-2.5 text-right">
                      {formatCurrency(summaryTotals.gross_sales)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-2.5">Total Discounts</td>
                    <td className="px-5 py-2.5 text-right">
                      {formatCurrency(paymentsBreakdown.total_discounts)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-2.5">Net Sales</td>
                    <td className="px-5 py-2.5 text-right">
                      {formatCurrency(summaryTotals.net_sales)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-2.5">Total Taxes</td>
                    <td className="px-5 py-2.5 text-right">
                      {formatCurrency(summaryTotals.total_tax)}
                    </td>
                  </tr>{" "}
                  <tr>
                    <td className="px-5 py-2.5">Total Revenue</td>
                    <td className="px-5 py-2.5 text-right">
                      {formatCurrency(summaryTotals.total_revenue)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-5 py-2.5">Total Redemptions</td>
                    <td className="px-5 py-2.5 text-right">
                      {formatCurrency(paymentsBreakdown.total_redemptions)}
                    </td>
                  </tr>
                  <tr className="bg-muted/40 font-semibold">
                    <td className="px-5 py-4">Net Revenue</td>
                    <td className="px-5 py-4 text-right">
                      {formatCurrency(summaryTotals.net_sales)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>{" "}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <>
            <Card className="overflow-hidden">
              <CardHeader className="py-4 px-5 border-b bg-muted/40">
                <CardTitle className="text-base font-medium">
                  Revenue by Type
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex justify-center items-center py-8">
                  <p>Loading revenue data...</p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="py-4 px-5 border-b bg-muted/40">
                <CardTitle className="text-base font-medium">
                  Payment Methods & Redemptions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex justify-center items-center py-8">
                  <p>Loading payment data...</p>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="overflow-hidden">
              <CardHeader className="py-4 px-5 border-b bg-muted/40">
                <CardTitle className="text-base font-medium">
                  Revenue by Type
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr>
                        <td className="px-5 py-3">Services Revenue</td>
                        <td className="px-5 py-3 text-right">
                          {formatCurrency(summaryTotals.services_revenue)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-5 py-3">Products Revenue</td>
                        <td className="px-5 py-3 text-right">
                          {formatCurrency(summaryTotals.products_revenue)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-5 py-3">Gift Cards Revenue</td>
                        <td className="px-5 py-3 text-right">
                          {formatCurrency(summaryTotals.gift_cards_revenue)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-5 py-3">Memberships Revenue</td>
                        <td className="px-5 py-3 text-right">
                          {formatCurrency(summaryTotals.memberships_revenue)}
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-5 py-3 font-medium">Total Revenue</td>
                        <td className="px-5 py-3 text-right font-medium">
                          {formatCurrency(summaryTotals.total_revenue)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <CardHeader className="py-4 px-5 border-b bg-muted/40">
                <CardTitle className="text-base font-medium">
                  Payment Methods & Redemptions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {/* Payment Methods */}
                      <tr className="bg-muted/10">
                        <td className="px-5 py-3 font-medium">
                          Payment Methods
                        </td>
                        <td className="px-5 py-3"></td>
                      </tr>
                      {Object.entries(summaryTotals.payment_methods || {}).map(
                        ([method, amount], index) => {
                          const displayName =
                            method.charAt(0).toUpperCase() + method.slice(1);
                          return (
                            <tr key={method}>
                              <td className="px-5 py-2.5">{displayName}</td>
                              <td className="px-5 py-2.5 text-right">
                                {formatCurrency(amount)}
                              </td>
                            </tr>
                          );
                        }
                      )}

                      {/* Redemptions */}
                      <tr className="border-t bg-muted/10">
                        <td className="px-5 py-3 font-medium">Redemptions</td>
                        <td className="px-5 py-3"></td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2.5">Gift card redemption</td>
                        <td className="px-5 py-2.5 text-right">
                          {formatCurrency(
                            paymentsBreakdown.gift_card_redemption
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2.5">Membership discount</td>
                        <td className="px-5 py-2.5 text-right">
                          {formatCurrency(
                            paymentsBreakdown.membership_redemption
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2.5">Loyalty points redeemed</td>
                        <td className="px-5 py-2.5 text-right">
                          {formatCurrency(
                            paymentsBreakdown.loyalty_points_redeemed
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2.5">
                          Referral wallet redeemed
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          {formatCurrency(
                            paymentsBreakdown.referral_wallet_redeemed
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2.5">Coupon discounts</td>
                        <td className="px-5 py-2.5 text-right">
                          {formatCurrency(paymentsBreakdown.coupon_discounts)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2.5">Manual discounts</td>
                        <td className="px-5 py-2.5 text-right">
                          {formatCurrency(paymentsBreakdown.manual_discounts)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2.5 font-medium">
                          Total redemptions & discounts
                        </td>
                        <td className="px-5 py-2.5 text-right font-medium">
                          {formatCurrency(paymentsBreakdown.total_discounts)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}{" "}
      </div>      {/* Shared Filter Dialog for both Desktop and Mobile */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">Filter Financial Data</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Apply filters to refine your financial analysis
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3 py-2 max-h-[50vh]">            <div className="space-y-1.5">
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
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payment Method</label>
              <Select
                value={filters.payment_method}
                onValueChange={(value) =>
                  handleFilterChange("payment_method", value)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All payment methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payment methods</SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem
                      key={method.id}
                      value={method.name.toLowerCase()}
                    >
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={filters.type}
                onValueChange={(value) => handleFilterChange("type", value)}
              >                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="service">Services</SelectItem>
                  <SelectItem value="membership">Memberships</SelectItem>
                  <SelectItem value="item">Items</SelectItem>
                  <SelectItem value="gift_card">Gift Cards</SelectItem>
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
            </Button>            <Button onClick={() => setFiltersOpen(false)} className="flex-1 h-9">
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>{" "}
      {/* Export actions are handled by ReportsLayout */}{" "}
    </div>
  );
}

// Named export for ReportsLayout.tsx
export { FinancialSummaryReport };
