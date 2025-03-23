
import { useState } from "react";
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

export function useRecentSales(daysAgo = 30) {
  const [isLoading, setIsLoading] = useState(false);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);

  async function fetchRecentSales() {
    setIsLoading(true);
    try {
      const startDate = formatISO(subDays(new Date(), daysAgo));
      
      // Fetch recent appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          id,
          customer_id,
          customer:profiles(full_name, email, phone_number),
          total_price,
          created_at
        `)
        .gte('created_at', startDate)
        .eq('transaction_type', 'sale')
        .is('original_appointment_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (appointmentsError) throw appointmentsError;

      // Fetch recent membership sales
      const { data: membershipSales, error: membershipError } = await supabase
        .from("membership_sales")
        .select(`
          id,
          customer_id,
          customer:profiles(full_name, email, phone_number),
          total_amount,
          sale_date,
          membership:memberships(id, name)
        `)
        .gte('sale_date', startDate)
        .eq('status', 'completed')
        .order('sale_date', { ascending: false })
        .limit(50);

      if (membershipError) throw membershipError;

      // Transform the appointments to include a type
      const typedAppointments: RecentAppointment[] = (appointments || []).map(app => ({
        ...app,
        type: 'appointment' as const
      }));

      // Transform the membership sales to include a type
      const typedMembershipSales: RecentMembershipSale[] = (membershipSales || []).map(sale => ({
        ...sale,
        type: 'membership' as const
      }));

      // Combine both arrays and sort by created_at/sale_date
      const combined = [...typedAppointments, ...typedMembershipSales].sort((a, b) => {
        const dateA = a.type === 'appointment' ? new Date(a.created_at) : new Date(a.sale_date);
        const dateB = b.type === 'appointment' ? new Date(b.created_at) : new Date(b.sale_date);
        return dateB.getTime() - dateA.getTime();
      });

      setRecentSales(combined);
    } catch (error) {
      console.error("Error fetching recent sales:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    isLoading,
    recentSales,
    fetchRecentSales
  };
}
