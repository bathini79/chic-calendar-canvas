import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Appointment, RefundData, TransactionDetails } from '../types';
import { useAppointmentNotifications, NOTIFICATION_TYPES } from '@/hooks/use-appointment-notifications';

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

export const useAppointmentActions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const { sendNotification } = useAppointmentNotifications();

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

      const typedAppointment = {
        ...appointment,
        discount_type: appointment.discount_type as Appointment['discount_type'],
        location_id: appointment.location,
      } as unknown as Appointment;

      if (typedAppointment.transaction_type === 'refund') {
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
          .eq('id', typedAppointment.original_appointment_id)
          .single();

        if (originalError) throw originalError;

        const typedOriginalSale = {
          ...originalSale,
          discount_type: originalSale.discount_type as Appointment['discount_type'],
          location_id: originalSale.location,
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
          .eq('original_appointment_id', typedOriginalSale.id)
          .eq('transaction_type', 'refund');

        if (refundsError) throw refundsError;

        const typedRefunds = refunds?.map(refund => ({
          ...refund,
          discount_type: refund.discount_type as Appointment['discount_type'],
          location_id: refund.location,
        })) as unknown as Appointment[];

        return {
          id: typedOriginalSale.id,
          amount: typedOriginalSale.total_price,
          status: typedOriginalSale.status,
          payment_method: typedOriginalSale.payment_method,
          created_at: typedOriginalSale.created_at || '',
          originalSale: typedOriginalSale,
          refunds: typedRefunds || []
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

        const typedRefunds = refunds?.map(refund => ({
          ...refund,
          discount_type: refund.discount_type as Appointment['discount_type'],
          location_id: refund.location,
        })) as unknown as Appointment[];

        return {
          id: typedAppointment.id,
          amount: typedAppointment.total_price,
          status: typedAppointment.status,
          payment_method: typedAppointment.payment_method,
          created_at: typedAppointment.created_at || '',
          originalSale: typedAppointment,
          refunds: typedRefunds || []
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

  const processRefund = async (
    appointmentId: string,
    bookingIds: string[],
    refundData: RefundData
  ) => {
    try {
      setIsLoading(true);

      const { data: originalAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('*, tax:tax_rates(*)')
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

      const { data: allBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status, price_paid, appointment_id')
        .eq('appointment_id', appointmentId);

      if (bookingsError) throw bookingsError;

      const refundAmount = allBookings
        ?.filter(booking => bookingIds.includes(booking.id))
        .reduce((total, booking) => total + (booking.price_paid || 0), 0) || 0;
        
      const totalBookingsAmount = allBookings?.reduce((total, booking) => 
        total + (booking.price_paid || 0), 0) || 0;
      
      const refundProportion = totalBookingsAmount > 0 ? refundAmount / totalBookingsAmount : 0;
      
      const taxAmount = originalAppointment.tax_amount || 0;
      const taxToRefund = taxAmount * refundProportion;
      
      const totalRefundAmount = refundAmount + taxToRefund;

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
          total_price: -totalRefundAmount,
          tax_amount: -taxToRefund,
          tax_id: originalAppointment.tax_id,
          start_time: originalAppointment.start_time,
          end_time: originalAppointment.end_time,
          discount_type: originalAppointment.discount_type,
          discount_value: originalAppointment.discount_value,
          payment_method: originalAppointment.payment_method,
          membership_discount: originalAppointment.membership_discount,
          membership_id: originalAppointment.membership_id,
          membership_name: originalAppointment.membership_name,
          coupon_id: originalAppointment.coupon_id,
          coupon_name: originalAppointment.coupon_name,
          coupon_amount: originalAppointment.coupon_amount,
          location: originalAppointment.location
        })
        .select()
        .single();

      if (refundError) throw refundError;

      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          status: 'refunded',
          refund_reason: mappedRefundReason,
          refund_notes: refundData.notes,
          refunded_by: refundData.refundedBy,
          refunded_at: new Date().toISOString()
        })
        .in('id', bookingIds);

      if (bookingUpdateError) throw bookingUpdateError;

      const isFullRefund = allBookings?.every(booking => 
        booking.status === 'refunded' || bookingIds.includes(booking.id)
      );

      for (const bookingId of bookingIds) {
        const originalBooking = allBookings?.find(b => b.id === bookingId);
        if (originalBooking) {
          const { data: bookingDetails, error: detailsError } = await supabase
            .from('bookings')
            .select('*, service:services(*), package:packages(*), employee:bookings_employee_id_fkey(*)')
            .eq('id', bookingId)
            .single();
            
          if (detailsError) throw detailsError;
            
          await supabase
            .from('bookings')
            .insert({
              appointment_id: refundAppointment.id,
              service_id: bookingDetails.service_id,
              package_id: bookingDetails.package_id,
              employee_id: bookingDetails.employee_id,
              price_paid: -bookingDetails.price_paid,
              original_price: bookingDetails.original_price,
              status: 'refunded',
              start_time: bookingDetails.start_time,
              end_time: bookingDetails.end_time
            });
        }
      }

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
    status: Appointment['status'],
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

      try {
        if (status === 'confirmed') {
          await sendNotification(appointmentId, 'APPOINTMENT_CONFIRMED');
        } else if (status === 'completed') {
          await sendNotification(appointmentId, 'APPOINTMENT_COMPLETED');
        }
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
      }

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

  const updateBookingStylelist = async (bookingId: string, employeeId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ employee_id: employeeId })
        .eq('id', bookingId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error updating booking stylist:", error);
      throw error;
    }
  };

  const cancelAppointment = async (appointmentId: string, bookingIds: string[] = []) => {
    if (bookingIds.length === 0) {
      const { data, error } = await supabase
        .from('bookings')
        .select('id')
        .eq('appointment_id', appointmentId);
      
      if (error) throw error;
      bookingIds = data.map(booking => booking.id);
    }
    
    return updateAppointmentStatus(appointmentId, 'canceled', bookingIds);
  };

  const markAppointmentAs = async (appointmentId: string, status: 'noshow' | 'completed') => {
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('appointment_id', appointmentId);
    
    if (error) throw error;
    const bookingIds = data.map(booking => booking.id);
    
    return updateAppointmentStatus(appointmentId, status, bookingIds);
  };

  const sendBookingConfirmation = async (appointmentId: string) => {
    try {
      setIsLoading(true);
      const success = await sendNotification(appointmentId, 'BOOKING_CONFIRMATION');
      return success;
    } catch (error: any) {
      console.error('Error sending booking confirmation:', error);
      toast.error(error.message || 'Failed to send booking confirmation');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendReminderNotification = async (appointmentId: string, hoursBeforeAppointment: 1 | 4) => {
    try {
      setIsLoading(true);
      const notificationType = hoursBeforeAppointment === 1 ? 'REMINDER_1_HOUR' : 'REMINDER_4_HOURS';
      const success = await sendNotification(appointmentId, notificationType as keyof typeof NOTIFICATION_TYPES);
      return success;
    } catch (error: any) {
      console.error('Error sending reminder notification:', error);
      toast.error(error.message || 'Failed to send reminder notification');
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
    updateBookingStylelist,
    cancelAppointment,
    markAppointmentAs,
    sendBookingConfirmation,
    sendReminderNotification
  };
};
