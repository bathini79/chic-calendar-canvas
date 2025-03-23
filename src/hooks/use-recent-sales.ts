
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatISO, subDays } from "date-fns";

// Define the types for the data we'll be fetching
export type RecentAppointment = {
  id: string;
  customer_id: string;
  customer: {
    full_name: string;
    email: string | null;
    phone_number: string | null;
  };
  total_price: number;
  created_at: string;
  type: 'appointment';
};

export type RecentMembershipSale = {
  id: string;
  customer_id: string;
  customer: {
    full_name: string;
    email: string | null;
    phone_number: string | null;
  };
  total_amount: number;
  sale_date: string;
  membership: {
    id: string;
    name: string;
  } | null;
  type: 'membership';
};

export type RecentSale = RecentAppointment | RecentMembershipSale;

export function useRecentSales(days = 30, limit = 10) {
  const [sales, setSales] = useState<RecentSale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentSales = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const startDate = formatISO(subDays(new Date(), days));
      
      // Fetch recent appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          id,
          customer_id,
          total_price,
          created_at,
          customer:profiles(full_name, email, phone_number)
        `)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (appointmentsError) throw appointmentsError;

      // Fetch recent membership sales
      const { data: membershipData, error: membershipError } = await supabase
        .from("membership_sales")
        .select(`
          id,
          customer_id,
          total_amount,
          sale_date,
          customer:profiles(full_name, email, phone_number),
          membership:memberships(id, name)
        `)
        .gte('sale_date', startDate)
        .order('sale_date', { ascending: false })
        .limit(limit);
      
      if (membershipError) throw membershipError;

      // Convert appointments to RecentSale format
      const appointmentSales: RecentAppointment[] = (appointmentsData || []).map(appointment => ({
        id: appointment.id,
        customer_id: appointment.customer_id,
        customer: {
          full_name: appointment.customer?.full_name || 'Unknown',
          email: appointment.customer?.email || null,
          phone_number: appointment.customer?.phone_number || null
        },
        total_price: appointment.total_price,
        created_at: appointment.created_at,
        type: 'appointment'
      }));

      // Convert membership sales to RecentSale format
      const membershipSales: RecentMembershipSale[] = (membershipData || []).map(sale => ({
        id: sale.id,
        customer_id: sale.customer_id,
        customer: {
          full_name: sale.customer?.full_name || 'Unknown',
          email: sale.customer?.email || null,
          phone_number: sale.customer?.phone_number || null
        },
        total_amount: sale.total_amount,
        sale_date: sale.sale_date,
        membership: sale.membership,
        type: 'membership'
      }));

      // Combine and sort all sales by date
      const combinedSales = [...appointmentSales, ...membershipSales].sort((a, b) => {
        const dateA = a.type === 'appointment' ? new Date(a.created_at) : new Date(a.sale_date);
        const dateB = b.type === 'appointment' ? new Date(b.created_at) : new Date(b.sale_date);
        return dateB.getTime() - dateA.getTime();
      });

      // Limit the final results
      setSales(combinedSales.slice(0, limit));
    } catch (err: any) {
      console.error("Error fetching recent sales:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [days, limit]);

  useEffect(() => {
    fetchRecentSales();
  }, [fetchRecentSales]);

  return {
    sales,
    isLoading,
    error,
    refetch: fetchRecentSales
  };
}
