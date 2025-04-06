
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.26.0'
import { Twilio } from 'https://esm.sh/twilio@4.11.0'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Define notification types
const NOTIFICATION_TYPES = {
  BOOKING_CONFIRMATION: 'booking_confirmation',
  APPOINTMENT_CONFIRMED: 'appointment_confirmed',
  REMINDER_1_HOUR: 'reminder_1_hour',
  REMINDER_4_HOURS: 'reminder_4_hours',
  APPOINTMENT_COMPLETED: 'appointment_completed'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { appointmentId, notificationType = NOTIFICATION_TYPES.BOOKING_CONFIRMATION, notificationId } = await req.json()
    
    if (!appointmentId) {
      throw new Error('Appointment ID is required')
    }
    
    if (!Object.values(NOTIFICATION_TYPES).includes(notificationType)) {
      throw new Error(`Invalid notification type. Must be one of: ${Object.values(NOTIFICATION_TYPES).join(', ')}`)
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase credentials not configured')
    }
    
    // Create admin client with service role key
    const adminClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey || supabaseAnonKey
    )
    
    // Get the notification details if notificationId is provided
    let notification = null
    let notificationMessage = null

    if (notificationId) {
      const { data: notificationData, error: notificationError } = await adminClient
        .from('notification_queue')
        .select('*')
        .eq('id', notificationId)
        .single()
        
      if (notificationError) {
        throw new Error(`Failed to retrieve notification: ${notificationError.message}`)
      }
      
      notification = notificationData
      notificationMessage = notificationData.message_content
    }

    // Get appointment details including customer info
    const { data: appointment, error: appointmentError } = await adminClient
      .from('appointments')
      .select(`
        id,
        customer_id,
        start_time,
        end_time,
        status,
        location,
        profiles:customer_id (
          full_name,
          phone_number
        ),
        bookings (
          id,
          service_id,
          package_id,
          services:service_id (
            name
          ),
          packages:package_id (
            name
          )
        )
      `)
      .eq('id', appointmentId)
      .single()
    
    if (appointmentError || !appointment) {
      throw new Error(`Failed to retrieve appointment: ${appointmentError?.message || 'Not found'}`)
    }

    if (!appointment.profiles?.phone_number) {
      throw new Error('Customer has no phone number registered')
    }

    // Get Twilio configuration from system_settings
    const { data: twilioConfig, error: twilioConfigError } = await adminClient
      .from('system_settings')
      .select('settings, is_active')
      .eq('category', 'twilio')
      .single()
    
    if (twilioConfigError || !twilioConfig) {
      throw new Error('Twilio is not configured')
    }

    if (!twilioConfig.is_active) {
      throw new Error('Twilio integration is not active')
    }

    const { accountSid, authToken, phoneNumber } = twilioConfig.settings

    if (!accountSid || !authToken || !phoneNumber) {
      throw new Error('Incomplete Twilio configuration')
    }

    // If message was not provided in the notification, generate it
    if (!notificationMessage) {
      // Format appointment services/packages for the message
      const servicesText = appointment.bookings
        .map(booking => booking.services?.name || booking.packages?.name)
        .filter(Boolean)
        .join(', ')

      // Format appointment date/time
      const appointmentDate = new Date(appointment.start_time)
      const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
      const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
        hour: '2-digit', 
        minute: '2-digit'
      })

      // Get location name if available
      let locationName = appointment.location || 'our salon';
      if (appointment.location) {
        try {
          const { data: locationData } = await adminClient
            .from('locations')
            .select('name')
            .eq('id', appointment.location)
            .single();
            
          if (locationData?.name) {
            locationName = locationData.name;
          }
        } catch (error) {
          console.error("Error fetching location:", error);
        }
      }

      // Compose WhatsApp message based on notification type
      switch (notificationType) {
        case NOTIFICATION_TYPES.BOOKING_CONFIRMATION:
          notificationMessage = `Hello ${appointment.profiles.full_name},\n\nThank you for booking with us! Your appointment has been scheduled at ${locationName} on ${formattedDate} at ${formattedTime}.\n\nService(s): ${servicesText}\n\nWe look forward to seeing you!`;
          break;
          
        case NOTIFICATION_TYPES.APPOINTMENT_CONFIRMED:
          notificationMessage = `Hello ${appointment.profiles.full_name},\n\nYour appointment at ${locationName} has been confirmed for ${formattedDate} at ${formattedTime}.\n\nService(s): ${servicesText}\n\nSee you soon!`;
          break;
          
        case NOTIFICATION_TYPES.REMINDER_1_HOUR:
          notificationMessage = `Hello ${appointment.profiles.full_name},\n\nThis is a reminder that your appointment at ${locationName} is in 1 hour, at ${formattedTime} today.\n\nService(s): ${servicesText}\n\nWe're looking forward to seeing you soon!`;
          break;
          
        case NOTIFICATION_TYPES.REMINDER_4_HOURS:
          notificationMessage = `Hello ${appointment.profiles.full_name},\n\nThis is a reminder that your appointment at ${locationName} is coming up in 4 hours on ${formattedDate} at ${formattedTime}.\n\nService(s): ${servicesText}\n\nWe're looking forward to seeing you!`;
          break;
          
        case NOTIFICATION_TYPES.APPOINTMENT_COMPLETED:
          notificationMessage = `Hello ${appointment.profiles.full_name},\n\nThank you for visiting us today at ${locationName}. We hope you enjoyed your ${servicesText}.\n\nWe appreciate your business and look forward to seeing you again soon!`;
          break;
          
        default:
          notificationMessage = `Hello ${appointment.profiles.full_name},\n\nThis is a reminder about your upcoming appointment at ${locationName} on ${formattedDate} at ${formattedTime}.\n\nService(s): ${servicesText}\n\nWe look forward to seeing you!`;
      }
    }

    // Initialize Twilio client
    const twilio = new Twilio(accountSid, authToken)
    
    // Send WhatsApp message through Twilio
    const messageResponse = await twilio.messages.create({
      body: notificationMessage,
      from: `whatsapp:${phoneNumber}`,
      to: `whatsapp:${appointment.profiles.phone_number}`
    })

    // If notification exists in the queue, update its status
    if (notification) {
      await adminClient
        .from('notification_queue')
        .update({ 
          status: 'sent',
          processed_at: new Date().toISOString()
        })
        .eq('id', notification.id)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Appointment notification sent successfully',
        notificationType,
        messageId: messageResponse.sid
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error: any) {
    console.error('Error sending WhatsApp notification:', error)
    
    // If a notification ID was provided, update its status to 'failed'
    try {
      const { notificationId } = await req.json()
      if (notificationId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if (supabaseUrl && supabaseServiceRoleKey) {
          const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)
          
          await adminClient
            .from('notification_queue')
            .update({ 
              status: 'failed',
              processed_at: new Date().toISOString(),
              error_message: error.message || "Unknown error"
            })
            .eq('id', notificationId)
        }
      }
    } catch (updateError) {
      console.error('Error updating notification status:', updateError)
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Failed to send appointment notification" 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Using 200 to avoid CORS issues with error responses
      }
    )
  }
})
