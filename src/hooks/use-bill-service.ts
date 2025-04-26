import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useBillService = () => {
  /**
   * Generates and sends a bill to a customer via WhatsApp using the Gupshup integration
   * @param appointmentId - The ID of the appointment to generate a bill for
   * @returns Promise<boolean> - Whether the bill was successfully sent
   */
  const sendBillToCustomer = async (appointmentId: string): Promise<boolean> => {
    if (!appointmentId) {
      toast.error('No appointment ID provided');
      return false;
    }
    
    try {
      // 1. Fetch appointment details to get customer information
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:profiles(*)
        `)
        .eq('id', appointmentId)
        .single();
      
      if (appointmentError) throw appointmentError;
      
      if (!appointment?.customer?.phone_number) {
        throw new Error('Customer phone number not found');
      }
      
      // 2. Generate bill message text
      const billNumber = appointment.id.slice(0, 8).toUpperCase();
      const formattedDate = new Date(appointment.created_at || appointment.start_time).toLocaleDateString();
      const totalAmount = appointment.total_price;
      
      // 3. Get business details for the message
      const { data: businessDetails, error: businessError } = await supabase
        .from('business_details')
        .select('name')
        .single();
      
      if (businessError) console.error('Error fetching business details:', businessError);
      
      // 4. Get location details if available
      let locationName = "our salon";
      if (appointment.location) {
        const { data: locationData, error: locationError } = await supabase
          .from('locations')
          .select('name')
          .eq('id', appointment.location)
          .single();
        
        if (!locationError && locationData) {
          locationName = locationData.name;
        }
      }
      
      const businessName = businessDetails?.name || 'Chic Calendar Canvas';
      
      // Generate a message with bill information
      const message = `Thank you for your visit to ${locationName}! Here is your bill receipt:\n\n` +
                     `Receipt #: ${billNumber}\n` +
                     `Date: ${formattedDate}\n` +
                     `Amount: ₹${totalAmount.toFixed(2)}\n\n` +
                     `You can view your full invoice at any time in your customer portal. Thank you for choosing ${businessName}!`;
      
      // 5. Call the Supabase Edge Function to send the WhatsApp message
      const { data: functionData, error: functionError } = await supabase.functions.invoke('send-bill', {
        body: JSON.stringify({
          appointmentId,
          message,
          notificationType: 'bill_receipt',
        }),
      });
      
      if (functionError) {
        throw new Error(functionError.message || 'Failed to send bill notification');
      }
      
      return true;
    } catch (error) {
      console.error('Error sending bill to customer:', error);
      toast.error(error.message || 'Failed to send bill to customer');
      return false;
    }
  };
  
  return {
    sendBillToCustomer
  };
};

export default useBillService;