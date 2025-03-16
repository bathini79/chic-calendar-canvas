import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Appointment, AppointmentStatus, RefundData, TransactionDetails } from '../types';

type RefundReason = "customer_dissatisfaction" | "service_quality_issue" | "scheduling_error" | "health_concern" | "price_dispute" | "other";

interface SelectedItem {
  id: string;
  name: string;
  price: number;
  type: 'service' | 'package';
  employee?: {
    id: string;
    name: string;
  };
  duration?: number;
}

export function useAppointmentActions(onUpdated?: () => void) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const fetchAppointmentDetails = async (appointmentId: string): Promise<TransactionDetails | null> => {
    try {
      setIsLoading(true);

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:profiles!appointments_customer_id_fkey(*),
          bookings (
            *,
            service:services(*),
            package:packages(*),
            employee:employees!bookings_employee_id_fkey(*)
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (appointmentError) throw appointmentError;

      const safeAppointment = {
        ...appointment,
        discount_type: appointment.discount_type as "none" | "fixed" | "percentage",
      } as unknown as Appointment;

      if (appointment.transaction_type === 'refund') {
        const { data: originalSale, error: originalError } = await supabase
          .from('appointments')
          .select(`
            *,
            customer:profiles!appointments_customer_id_fkey(*),
            bookings (
              *,
              service:services(*),
              package:packages(*),
              employee:employees!bookings_employee_id_fkey(*)
            )
          `)
          .eq('id', appointment.original_appointment_id)
          .single();

        if (originalError) throw originalError;

        const safeOriginalSale = {
          ...originalSale,
          discount_type: originalSale.discount_type as "none" | "fixed" | "percentage",
        } as unknown as Appointment;

        const { data: refunds, error: refundsError } = await supabase
          .from('appointments')
          .select(`
            *,
            customer:profiles!appointments_customer_id_fkey(*),
            bookings (
              *,
              service:services(*),
              package:packages(*),
              employee:employees!bookings_employee_id_fkey(*)
            )
          `)
          .eq('original_appointment_id', originalSale.id)
          .eq('transaction_type', 'refund');

        if (refundsError) throw refundsError;

        const safeRefunds = refunds?.map(refund => ({
          ...refund,
          discount_type: refund.discount_type as "none" | "fixed" | "percentage",
        })) as unknown as Appointment[];

        return {
          id: safeOriginalSale.id,
          amount: safeOriginalSale.total_price,
          status: safeOriginalSale.status,
          payment_method: safeOriginalSale.payment_method,
          created_at: safeOriginalSale.created_at,
          originalSale: safeOriginalSale,
          refunds: safeRefunds || []
        };
      } else {
        const { data: refunds, error: refundsError } = await supabase
          .from('appointments')
          .select(`
            *,
            customer:profiles!appointments_customer_id_fkey(*),
            bookings (
              *,
              service:services(*),
              package:packages(*),
              employee:employees!bookings_employee_id_fkey(*)
            )
          `)
          .eq('original_appointment_id', appointmentId)
          .eq('transaction_type', 'refund');

        if (refundsError) throw refundsError;

        const safeRefunds = refunds?.map(refund => ({
          ...refund,
          discount_type: refund.discount_type as "none" | "fixed" | "percentage",
        })) as unknown as Appointment[];

        return {
          id: safeAppointment.id,
          amount: safeAppointment.total_price,
          status: safeAppointment.status,
          payment_method: safeAppointment.payment_method,
          created_at: safeAppointment.created_at,
          originalSale: safeAppointment,
          refunds: safeRefunds || []
        };
      }
    } catch (error: any) {
      console.error('Error fetching appointment:', error);
      toast.error('Failed to load appointment details');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const changeStatus = async (appointmentId: string, status: AppointmentStatus) => {
    try {
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('id, bookings(id)')
        .eq('id', appointmentId)
        .single();

      if (fetchError) throw fetchError;

      const bookingIds = appointment.bookings.map((booking: any) => booking.id);
      
      await updateAppointmentStatus(appointmentId, status, bookingIds);
      
      if (onUpdated) {
        onUpdated();
      }
      
      return true;
    } catch (error: any) {
      console.error('Error changing status:', error);
      toast.error(error.message || 'Failed to change appointment status');
      return false;
    }
  };

  const refundAppointment = async (appointmentId: string, reason: string, notes: string) => {
    try {
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('id, bookings(id)')
        .eq('id', appointmentId)
        .single();

      if (fetchError) throw fetchError;

      const bookingIds = appointment.bookings.map((booking: any) => booking.id);
      
      const refundData: RefundData = {
        reason,
        notes,
        refundedBy: 'system' // This should be replaced with the actual user ID in a real app
      };
      
      await processRefund(appointmentId, bookingIds, refundData);
      
      if (onUpdated) {
        onUpdated();
      }
      
      return true;
    } catch (error: any) {
      console.error('Error processing refund:', error);
      toast.error(error.message || 'Failed to process refund');
      return false;
    }
  };

  const processRefund = async (
    appointmentId: string,
    bookingIds: string[],
    refundData: RefundData
  ) => {
    try {
      setIsLoading(true);

      const { data: originalAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (appointmentError) throw appointmentError;

      let mappedRefundReason: RefundReason = "other";
      if (refundData.reason === "booking_error") {
        mappedRefundReason = "scheduling_error";
      } else if (refundData.reason === "service_unavailable") {
        mappedRefundReason = "service_quality_issue";
      } else if (refundData.reason === "customer_emergency" || refundData.reason === "customer_no_show") {
        mappedRefundReason = "other";
      } else if (
        ["customer_dissatisfaction", "service_quality_issue", "scheduling_error", 
         "health_concern", "price_dispute", "other"].includes(refundData.reason as string)
      ) {
        mappedRefundReason = refundData.reason as RefundReason;
      }

      const { data: refundAppointment, error: refundError } = await supabase
        .from('appointments')
        .insert({
          customer_id: originalAppointment.customer_id,
          status: 'refunded',
          transaction_type: 'refund',
          original_appointment_id: appointmentId,
          refunded_by: refundData.refundedBy,
          refund_reason: mappedRefundReason,
          refund_notes: refundData.notes,
          total_price: 0,
          start_time: originalAppointment.start_time,
          end_time: originalAppointment.end_time
        })
        .select()
        .single();

      if (refundError) throw refundError;

      const { error: bookingsError } = await supabase
        .from('bookings')
        .update({
          status: 'refunded',
          refund_reason: mappedRefundReason,
          refund_notes: refundData.notes,
          refunded_by: refundData.refundedBy,
          refunded_at: new Date().toISOString()
        })
        .in('id', bookingIds);

      if (bookingsError) throw bookingsError;

      const { data: allBookings, error: countError } = await supabase
        .from('bookings')
        .select('id, status, price_paid')
        .eq('appointment_id', appointmentId);

      if (countError) throw countError;

      const isFullRefund = allBookings?.every(booking => 
        booking.status === 'refunded' || bookingIds.includes(booking.id)
      );

      const refundAmount = allBookings
        ?.filter(booking => bookingIds.includes(booking.id))
        .reduce((total, booking) => total + (booking.price_paid || 0), 0) || 0;

      const { error: updateRefundError } = await supabase
        .from('appointments')
        .update({
          total_price: -refundAmount
        })
        .eq('id', refundAppointment.id);

      if (updateRefundError) throw updateRefundError;

      const { error: originalAppointmentError } = await supabase
        .from('appointments')
        .update({
          status: isFullRefund ? 'refunded' : 'partially_refunded'
        })
        .eq('id', appointmentId);

      if (originalAppointmentError) throw originalAppointmentError;

      await fetchAppointmentDetails(appointmentId);

      toast.success('Refund processed successfully');
      return true;
    } catch (error: any) {
      console.error('Error processing refund:', error);
      toast.error(error.message || 'Failed to process refund');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateAppointmentStatus = async (
    appointmentId: string,
    status: AppointmentStatus,
    bookingIds: string[]
  ) => {
    try {
      setIsLoading(true);

      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      const { error: bookingsError } = await supabase
        .from('bookings')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .in('id', bookingIds);

      if (bookingsError) throw bookingsError;

      let message = '';
      switch (status) {
        case 'canceled':
          message = 'Appointment canceled successfully';
          break;
        case 'noshow':
          message = 'Appointment marked as no-show';
          break;
        default:
          message = `Appointment ${status} successfully`;
      }
      
      toast.success(message);
      return true;
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      toast.error(error.message || 'Failed to update appointment');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    selectedItems,
    fetchAppointmentDetails,
    updateAppointmentStatus,
    processRefund,
    changeStatus,
    refundAppointment
  };
}
