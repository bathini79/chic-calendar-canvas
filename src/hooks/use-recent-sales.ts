
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
      // Use the new Supabase function to get all recent sales
      const { data, error: salesError } = await supabase
        .rpc('get_recent_sales', { days_param: days, limit_param: limit });
      
      if (salesError) throw salesError;

      // Process the sales data
      if (data && data.length > 0) {
        const processedSales: RecentSale[] = data.map(sale => {
          if (sale.sale_type === 'appointment') {
            return {
              id: sale.id,
              customer_id: sale.customer_id,
              customer: {
                full_name: sale.customer_name || 'Unknown',
                email: sale.customer_email,
                phone_number: sale.customer_phone
              },
              total_price: sale.amount || 0,
              created_at: sale.created_at,
              type: 'appointment'
            } as RecentAppointment;
          } else {
            // Handle membership sales
            return {
              id: sale.id,
              customer_id: sale.customer_id,
              customer: {
                full_name: sale.customer_name || 'Unknown',
                email: sale.customer_email,
                phone_number: sale.customer_phone
              },
              total_amount: sale.amount || 0,
              sale_date: sale.created_at,
              membership: null, // We'll fetch membership details separately if needed
              type: 'membership'
            } as RecentMembershipSale;
          }
        });

        setSales(processedSales);
      } else {
        setSales([]);
      }

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
