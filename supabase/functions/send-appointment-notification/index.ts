
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.26.0'
import { Twilio } from 'https://esm.sh/twilio@4.11.0'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Notification types
type NotificationType = 'booking_confirmation' | 'appointment_confirmed' | 'reminder_1hr' | 'reminder_4hr' | 'appointment_completed';

// Message templates for different notification types
const messageTemplates: Record<NotificationType, (customerName: string, serviceName: string, location: string, date: string, time: string) => string> = {
  booking_confirmation: (name, service, location, date, time) => 
    `Hello ${name},\n\nThank you for booking an appointment at ${location} on ${date} at ${time}.\n\nService(s): ${service}\n\nWe'll confirm your appointment shortly.`,
  
  appointment_confirmed: (name, service, location, date, time) => 
    `Hello ${name},\n\nYour appointment at ${location} on ${date} at ${time} has been confirmed.\n\nService(s): ${service}\n\nWe look forward to seeing you!`,
  
  reminder_1hr: (name, service, location, date, time) => 
    `Hello ${name},\n\nThis is a reminder that your appointment at ${location} is in 1 hour (${time}).\n\nService(s): ${service}\n\nSee you soon!`,
  
  reminder_4hr: (name, service, location, date, time) => 
    `Hello ${name},\n\nThis is a reminder that your appointment at ${location} is in 4 hours today (${date} at ${time}).\n\nService(s): ${service}\n\nSee you soon!`,
  
  appointment_completed: (name, service, location, date, time) => 
    `Hello ${name},\n\nThank you for visiting ${location} today.\n\nWe hope you enjoyed your ${service}. We look forward to seeing you again soon!`
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { appointmentId, notificationType = 'appointment_confirmed' } = await req.json()
    
    if (!appointmentId) {
      throw new Error('Appointment ID is required')
    }
    
    if (!Object.keys(messageTemplates).includes(notificationType)) {
      throw new Error(`Invalid notification type: ${notificationType}. Valid types are: ${Object.keys(messageTemplates).join(', ')}`)
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase credentials not configured')
    }
    
    // Create authenticated client
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    // Verify the user has required access rights
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      console.error("Authentication error:", authError)
      throw new Error('User not authenticated')
    }
    
    // Get admin status
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      
    if (profileError) {
      console.error("Profile lookup error:", profileError)
      throw new Error(`Failed to retrieve user profile: ${profileError.message}`)
    }
    
    // Only allow admins to send notifications
    if (!profileData || !['admin', 'superadmin'].includes(profileData.role)) {
      console.error("Unauthorized access attempt by:", user.id, "with role:", profileData?.role)
      throw new Error('Unauthorized: Admin access required')
    }

    // Get appointment details including customer info
    const { data: appointment, error: appointmentError } = await supabaseClient
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
      console.error("Appointment lookup error:", appointmentError)
      throw new Error(`Failed to retrieve appointment: ${appointmentError?.message || 'Not found'}`)
    }

    if (!appointment.profiles?.phone_number) {
      throw new Error('Customer has no phone number registered')
    }

    // Get Twilio configuration using edge function without storing in DB
    const serviceRoleClient = createClient(supabaseUrl, supabaseServiceRoleKey)
    const { data: twilioConfig, error: twilioConfigError } = await serviceRoleClient
      .functions.invoke('get-twilio-config')
    
    if (twilioConfigError) {
      console.error("Twilio config error:", twilioConfigError)
      throw new Error('Failed to get Twilio configuration')
    }

    if (!twilioConfig.isActive) {
      throw new Error('Twilio integration is not active')
    }

    const { accountSid, authToken, phoneNumber } = twilioConfig

    if (!accountSid || !authToken || !phoneNumber) {
      throw new Error('Incomplete Twilio configuration')
    }

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

    // Get the appropriate message template for this notification type
    const messageText = messageTemplates[notificationType as NotificationType](
      appointment.profiles.full_name,
      servicesText,
      appointment.location || 'our salon',
      formattedDate,
      formattedTime
    )

    // Initialize Twilio client
    const twilio = new Twilio(accountSid, authToken)
    
    // Send WhatsApp message through Twilio
    await twilio.messages.create({
      body: messageText,
      from: `whatsapp:${phoneNumber}`,
      to: `whatsapp:${appointment.profiles.phone_number}`
    })

    console.log(`Successfully sent ${notificationType} notification for appointment ${appointmentId}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${notificationType} notification sent successfully` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error: any) {
    console.error('Error sending WhatsApp notification:', error)
    
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
