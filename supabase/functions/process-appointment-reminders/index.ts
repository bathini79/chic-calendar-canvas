
// This edge function runs on a schedule to send appointment reminders
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.26.0'
import { Twilio } from 'https://esm.sh/twilio@4.11.0'

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
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Required environment variables are missing')
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Get Twilio configuration from system_settings
    const { data: twilioConfig, error: twilioConfigError } = await supabase
      .from('system_settings')
      .select('settings, is_active')
      .eq('category', 'twilio')
      .single()
    
    if (twilioConfigError || !twilioConfig || !twilioConfig.is_active) {
      throw new Error('Twilio configuration not found or inactive')
    }

    const { accountSid, authToken, phoneNumber } = twilioConfig.settings

    if (!accountSid || !authToken || !phoneNumber) {
      throw new Error('Incomplete Twilio configuration')
    }

    // Initialize Twilio client
    const twilio = new Twilio(accountSid, authToken)

    // Get current time
    const now = new Date()
    
    // 1. Find appointments needing 1-hour reminders
    // These are appointments starting between 1 hour and 1 hour 5 minutes from now
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    const oneHourFiveMinutesFromNow = new Date(now.getTime() + 65 * 60 * 1000)
    
    const { data: oneHourReminders, error: oneHourError } = await supabase
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
      .gte('start_time', oneHourFromNow.toISOString())
      .lt('start_time', oneHourFiveMinutesFromNow.toISOString())
      .in('status', ['booked', 'confirmed'])
      .not('profiles.phone_number', 'is', null)

    if (oneHourError) {
      throw new Error(`Error fetching 1-hour reminders: ${oneHourError.message}`)
    }

    // 2. Find appointments needing 4-hour reminders
    // These are appointments starting between 4 hours and 4 hours 5 minutes from now
    const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000)
    const fourHoursFiveMinutesFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000 + 5 * 60 * 1000)
    
    const { data: fourHourReminders, error: fourHourError } = await supabase
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
      .gte('start_time', fourHoursFromNow.toISOString())
      .lt('start_time', fourHoursFiveMinutesFromNow.toISOString())
      .in('status', ['booked', 'confirmed'])
      .not('profiles.phone_number', 'is', null)

    if (fourHourError) {
      throw new Error(`Error fetching 4-hour reminders: ${fourHourError.message}`)
    }

    // Process all 1-hour reminders
    const oneHourResults = await Promise.allSettled(
      (oneHourReminders || []).map(async (appointment) => {
        if (!appointment.profiles?.phone_number) return null;
        
        try {
          // Format appointment services/packages for the message
          const servicesText = appointment.bookings
            .map(booking => booking.services?.name || booking.packages?.name)
            .filter(Boolean)
            .join(', ')

          // Format appointment date/time  
          const appointmentDate = new Date(appointment.start_time)
          const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
            hour: '2-digit', 
            minute: '2-digit'
          })

          // Get location name if available
          let locationName = appointment.location || 'our salon'
          if (appointment.location) {
            try {
              const { data: locationData } = await supabase
                .from('locations')
                .select('name')
                .eq('id', appointment.location)
                .single()
                
              if (locationData?.name) {
                locationName = locationData.name
              }
            } catch (error) {
              console.error("Error fetching location:", error)
            }
          }

          // Compose message
          const message = `Hello ${appointment.profiles.full_name},\n\nThis is a reminder that your appointment at ${locationName} is in 1 hour, at ${formattedTime} today.\n\nService(s): ${servicesText}\n\nWe're looking forward to seeing you soon!`

          // Send message
          await twilio.messages.create({
            body: message,
            from: `whatsapp:${phoneNumber}`,
            to: `whatsapp:${appointment.profiles.phone_number}`
          })

          return appointment.id
        } catch (error) {
          console.error(`Error sending 1-hour reminder for appointment ${appointment.id}:`, error)
          return null
        }
      })
    )

    // Process all 4-hour reminders
    const fourHourResults = await Promise.allSettled(
      (fourHourReminders || []).map(async (appointment) => {
        if (!appointment.profiles?.phone_number) return null
        
        try {
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
          let locationName = appointment.location || 'our salon'
          if (appointment.location) {
            try {
              const { data: locationData } = await supabase
                .from('locations')
                .select('name')
                .eq('id', appointment.location)
                .single()
                
              if (locationData?.name) {
                locationName = locationData.name
              }
            } catch (error) {
              console.error("Error fetching location:", error)
            }
          }

          // Compose message
          const message = `Hello ${appointment.profiles.full_name},\n\nThis is a reminder that your appointment at ${locationName} is coming up in 4 hours on ${formattedDate} at ${formattedTime}.\n\nService(s): ${servicesText}\n\nWe're looking forward to seeing you!`

          // Send message
          await twilio.messages.create({
            body: message,
            from: `whatsapp:${phoneNumber}`,
            to: `whatsapp:${appointment.profiles.phone_number}`
          })

          return appointment.id
        } catch (error) {
          console.error(`Error sending 4-hour reminder for appointment ${appointment.id}:`, error)
          return null
        }
      })
    )

    // Count successful reminders
    const oneHourSuccessful = oneHourResults.filter(r => r.status === 'fulfilled' && r.value !== null).length
    const fourHourSuccessful = fourHourResults.filter(r => r.status === 'fulfilled' && r.value !== null).length
    const totalSent = oneHourSuccessful + fourHourSuccessful
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed reminders`,
        oneHourReminders: {
          total: oneHourReminders?.length || 0,
          successful: oneHourSuccessful
        },
        fourHourReminders: {
          total: fourHourReminders?.length || 0,
          successful: fourHourSuccessful
        },
        totalSent
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error: any) {
    console.error('Error processing appointment reminders:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process appointment reminders'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Using 200 to avoid CORS issues with error responses
      }
    )
  }
})
