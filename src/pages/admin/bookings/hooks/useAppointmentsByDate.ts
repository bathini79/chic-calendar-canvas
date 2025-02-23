
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { Appointment } from "../types";

export const useAppointmentsByDate = (currentDate: Date) => {
    return useQuery({
      queryKey: ["appointments", format(currentDate, "yyyy-MM-dd")],
      queryFn: async () => {
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
  
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);
  
        const { data, error } = await supabase
          .from("appointments")
          .select(
            `
            *,
            bookings (
              *,
              service:services (*),
              package:packages (*),
              employee:employees (
                id,
                name,
                email,
                phone,
                avatar,
                employment_type,
                status
              )
            ),
            customer:profiles (
              id,
              full_name,
              email,
              phone_number,
              role,
              created_at,
              updated_at
            )
          `
          )
          .gte("start_time", startOfDay.toISOString())
          .lte("start_time", endOfDay.toISOString())
          .not("status", "eq", "voided");

        if (error) {
          console.error("Error fetching appointments:", error);
          throw error;
        }

        // Transform the data to ensure it matches the expected types
        const transformedData = data?.map(appointment => ({
          ...appointment,
          payment_method: appointment.payment_method as "cash" | "online",
          discount_type: appointment.discount_type as "none" | "percentage" | "fixed",
          discount_value: appointment.discount_value || 0,
          transaction_type: appointment.transaction_type || "sale",
          bookings: appointment.bookings?.map(booking => ({
            ...booking,
            employee: booking.employee || {
              id: "",
              name: "Unknown",
              email: "",
              employment_type: "stylist",
              status: "active"
            }
          })) || []
        })) as Appointment[];

        return transformedData || [];
      },
      refetchInterval: 30000, // Refetch every 30 seconds to keep calendar up to date
    });
  };
