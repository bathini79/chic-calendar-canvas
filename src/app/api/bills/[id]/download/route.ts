import { supabase } from '@/integrations/supabase/client';
import { BillPDF } from '@/components/billing/BillGenerator';
import React from 'react';
import { pdf } from '@react-pdf/renderer';

// Create a downloadable PDF bill for a specific appointment
export async function generateBillPDF(appointmentId: string): Promise<{
  blob: Blob | null;
  filename: string;
  error?: string;
}> {
  try {
    if (!appointmentId) {
      return { blob: null, filename: '', error: 'Appointment ID is required' };
    }

    // Fetch appointment details
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        customer:profiles(*),
        bookings (
          *,
          service:services(*),
          package:packages(*),
          employee:employees!bookings_employee_id_fkey(*)
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError) {
      console.error('Error fetching appointment:', appointmentError);
      return { blob: null, filename: '', error: 'Failed to fetch appointment data' };
    }

    // Fetch location details
    let locationData = null;
    if (appointmentData.location) {
      const { data: locData, error: locError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', appointmentData.location)
        .single();

      if (!locError && locData) {
        locationData = locData;
      }
    }

    // Fetch business details
    const { data: businessData, error: businessError } = await supabase
      .from('business_details')
      .select('*')
      .single();

    if (businessError) {
      console.error('Error fetching business details:', businessError);
    }

    // Create BillPDF element
    const pdfElement = React.createElement(BillPDF, {
      appointment: appointmentData,
      business: businessData || {},
      location: locationData || {}
    });
    
    // Generate PDF blob - using pdf() method which works in browser
    const blob = await pdf(pdfElement).toBlob();
    const filename = `invoice-${appointmentId.substring(0, 8)}.pdf`;
    
    return { blob, filename };
  } catch (error) {
    console.error('Error generating bill:', error);
    return { blob: null, filename: '', error: 'Failed to generate bill' };
  }
}