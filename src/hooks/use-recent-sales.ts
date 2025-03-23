
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
