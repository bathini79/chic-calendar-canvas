
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.26.0'
import { Twilio } from 'https://esm.sh/twilio@4.11.0'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { appointmentId } = await req.json()
    
    if (!appointmentId) {
      throw new Error('Appointment ID is required')
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

    // Get Twilio configuration from system_settings
    const serviceRoleClient = createClient(supabaseUrl, supabaseServiceRoleKey)
    const { data: twilioConfig, error: twilioConfigError } = await serviceRoleClient
      .from('system_settings')
      .select('settings, is_active')
      .eq('category', 'twilio')
      .single()
    
    if (twilioConfigError || !twilioConfig) {
      console.error("Twilio config error:", twilioConfigError)
      throw new Error('Twilio is not configured')
    }

    if (!twilioConfig.is_active) {
      throw new Error('Twilio integration is not active')
    }

    const { accountSid, authToken, phoneNumber } = twilioConfig.settings

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

    // Compose WhatsApp message
    const message = `Hello ${appointment.profiles.full_name},\n\nThis is a reminder about your upcoming appointment at ${appointment.location} on ${formattedDate} at ${formattedTime}.\n\nService(s): ${servicesText}\n\nWe look forward to seeing you!`

    // Initialize Twilio client
    const twilio = new Twilio(accountSid, authToken)
    
    // Send WhatsApp message through Twilio
    await twilio.messages.create({
      body: message,
      from: `whatsapp:${phoneNumber}`,
      to: `whatsapp:${appointment.profiles.phone_number}`
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Appointment notification sent successfully' 
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
