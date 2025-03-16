import { supabase } from "@/integrations/supabase/client";
import { Appointment } from "../types";

const APPOINTMENTS_TABLE = "appointments";

interface SaveAppointmentParams {
  appointmentId?: string;
  customerId: string;
  date: Date;
  time: string;
  services: string[];
  packages: string[];
  stylists: Record<string, string>;
  totalPrice: number;
  duration: number;
  discountType: "none" | "fixed" | "percentage";
  discountValue: number;
  paymentMethod: string;
  notes: string;
  status: string;
  locationId: string;
}

export default function useAppointmentActions() {
  const createAppointment = async (
    params: SaveAppointmentParams
  ): Promise<{ success: boolean; data: Appointment | null; error: any }> => {
    try {
      const {
        customerId,
        date,
        time,
        services,
        packages,
        stylists,
        totalPrice,
        duration,
        discountType,
        discountValue,
        paymentMethod,
        notes,
        status,
        locationId
      } = params;

      const startDateTime = new Date(date);
      const [hours, minutes] = time.split(":").map(Number);
      startDateTime.setHours(hours, minutes, 0, 0);

      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      const { data: appointment, error: appointmentError } = await supabase
        .from(APPOINTMENTS_TABLE)
        .insert([
          {
            customer_id: customerId,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            total_price: totalPrice,
            total_duration: duration,
            discount_type: discountType,
            discount_value: discountValue,
            payment_method: paymentMethod,
            notes: notes,
            status: status,
            location: locationId,
          },
        ])
        .select("*")
        .single();

      if (appointmentError) {
        console.error("Error creating appointment:", appointmentError);
        return { success: false, data: null, error: appointmentError };
      }

      const formattedAppointment = {
        ...appointment,
        discount_type: appointment.discount_type as "none" | "fixed" | "percentage",
      } as Appointment;

      const bookingPromises = [
        ...services.map((serviceId) =>
          supabase.from("bookings").insert([
            {
              appointment_id: appointment.id,
              service_id: serviceId,
              employee_id: stylists[serviceId] || null,
              price_paid: totalPrice,
              status: status,
              start_time: startDateTime.toISOString(),
              end_time: endDateTime.toISOString(),
            },
          ])
        ),
        ...packages.map((packageId) =>
          supabase.from("bookings").insert([
            {
              appointment_id: appointment.id,
              package_id: packageId,
              employee_id: stylists[packageId] || null,
              price_paid: totalPrice,
              status: status,
              start_time: startDateTime.toISOString(),
              end_time: endDateTime.toISOString(),
            },
          ])
        ),
      ];

      await Promise.all(bookingPromises);

      return { success: true, data: formattedAppointment, error: null };
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      return { success: false, data: null, error: error };
    }
  };

  const updateAppointment = async (
    appointmentId: string,
    params: SaveAppointmentParams
  ): Promise<{ success: boolean; data: Appointment | null; error: any }> => {
    try {
      const {
        customerId,
        date,
        time,
        services,
        packages,
        stylists,
        totalPrice,
        duration,
        discountType,
        discountValue,
        paymentMethod,
        notes,
        status,
        locationId
      } = params;

      const startDateTime = new Date(date);
      const [hours, minutes] = time.split(":").map(Number);
      startDateTime.setHours(hours, minutes, 0, 0);

      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      const { data: appointment, error: appointmentError } = await supabase
        .from(APPOINTMENTS_TABLE)
        .update({
          customer_id: customerId,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          total_price: totalPrice,
          total_duration: duration,
          discount_type: discountType,
          discount_value: discountValue,
          payment_method: paymentMethod,
          notes: notes,
          status: status,
          location: locationId,
        })
        .eq("id", appointmentId)
        .select("*")
        .single();

      if (appointmentError) {
        console.error("Error updating appointment:", appointmentError);
        return { success: false, data: null, error: appointmentError };
      }

      const formattedAppointment = {
        ...appointment,
        discount_type: appointment.discount_type as "none" | "fixed" | "percentage",
      } as Appointment;

      // First, delete existing bookings for this appointment
      const { error: deleteError } = await supabase
        .from("bookings")
        .delete()
        .eq("appointment_id", appointmentId);

      if (deleteError) {
        console.error("Error deleting existing bookings:", deleteError);
        return { success: false, data: null, error: deleteError };
      }

      // Then, recreate the bookings
      const bookingPromises = [
        ...services.map((serviceId) =>
          supabase.from("bookings").insert([
            {
              appointment_id: appointment.id,
              service_id: serviceId,
              employee_id: stylists[serviceId] || null,
              price_paid: totalPrice,
              status: status,
              start_time: startDateTime.toISOString(),
              end_time: endDateTime.toISOString(),
            },
          ])
        ),
        ...packages.map((packageId) =>
          supabase.from("bookings").insert([
            {
              appointment_id: appointment.id,
              package_id: packageId,
              employee_id: stylists[packageId] || null,
              price_paid: totalPrice,
              status: status,
              start_time: startDateTime.toISOString(),
              end_time: endDateTime.toISOString(),
            },
          ])
        ),
      ];

      await Promise.all(bookingPromises);

      return { success: true, data: formattedAppointment, error: null };
    } catch (error: any) {
      console.error("Error updating appointment:", error);
      return { success: false, data: null, error: error };
    }
  };

  const deleteAppointment = async (
    appointmentId: string
  ): Promise<{ success: boolean; error: any }> => {
    try {
      // First, delete associated bookings
      const { error: deleteBookingsError } = await supabase
        .from("bookings")
        .delete()
        .eq("appointment_id", appointmentId);

      if (deleteBookingsError) {
        console.error("Error deleting bookings:", deleteBookingsError);
        return { success: false, error: deleteBookingsError };
      }

      // Then, delete the appointment
      const { error: deleteAppointmentError } = await supabase
        .from(APPOINTMENTS_TABLE)
        .delete()
        .eq("id", appointmentId);

      if (deleteAppointmentError) {
        console.error("Error deleting appointment:", deleteAppointmentError);
        return { success: false, error: deleteAppointmentError };
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error("Error deleting appointment:", error);
      return { success: false, error: error };
    }
  };

  const getAppointmentById = async (
    appointmentId: string
  ): Promise<{ success: boolean; data: Appointment | null; error: any }> => {
    try {
      const { data, error } = await supabase
        .from(APPOINTMENTS_TABLE)
        .select("*")
        .eq("id", appointmentId)
        .single();

      if (error) {
        console.error("Error fetching appointment:", error);
        return { success: false, data: null, error };
      }

      return { success: true, data: data as Appointment, error: null };
    } catch (error: any) {
      console.error("Error fetching appointment:", error);
      return { success: false, data: null, error };
    }
  };

  const getAllAppointments = async (): Promise<{
    success: boolean;
    data: Appointment[] | null;
    error: any;
  }> => {
    try {
      const { data, error } = await supabase
        .from(APPOINTMENTS_TABLE)
        .select("*");

      if (error) {
        console.error("Error fetching appointments:", error);
        return { success: false, data: null, error };
      }

      const formattedAppointments = data.map(appointment => ({
        ...appointment,
        discount_type: appointment.discount_type as "none" | "fixed" | "percentage",
      })) as Appointment[];

      return { success: true, data: formattedAppointments, error: null };
    } catch (error: any) {
      console.error("Error fetching appointments:", error);
      return { success: false, data: null, error };
    }
  };

  return {
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointmentById,
    getAllAppointments,
  };
}
