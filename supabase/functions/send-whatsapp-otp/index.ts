
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Hello from send-whatsapp-otp function!")

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { phoneNumber } = await req.json()
    console.log(`Processing OTP request for phone: ${phoneNumber}`)

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    console.log(`Generated OTP: ${otp} for phone: ${phoneNumber}`)

    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Store the OTP in the database with an expiration time (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    const { data: otpData, error: otpError } = await supabase
      .from('phone_auth_codes')
      .insert([
        {
          phone_number: phoneNumber,
          code: otp,
          expires_at: expiresAt.toISOString(),
        },
      ])
      .select()

    if (otpError) {
      throw new Error(`Error storing OTP: ${otpError.message}`)
    }

    console.log(`OTP stored in database for phone: ${phoneNumber}`)

    // Send the OTP via Twilio WhatsApp
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')
    const companyName = Deno.env.get('COMPANY_NAME') || 'Salon App'

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured')
    }

    console.log(`Attempting to send OTP to: ${phoneNumber} using Twilio WhatsApp`)

    // Format the message
    const message = `Your ${companyName} verification code is: ${otp}. This code will expire in 15 minutes.`

    // Send the message via Twilio
    const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`
    const twilioResponse = await fetch(twilioEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
      },
      body: new URLSearchParams({
        To: `${phoneNumber}`,
        From: twilioPhoneNumber,
        Body: message,
      }),
    })

    if (!twilioResponse.ok) {
      const twilioError = await twilioResponse.text()
      throw new Error(`Twilio API error: ${twilioError}`)
    }

    const twilioData = await twilioResponse.json()
    console.log(`Twilio message sent successfully: ${twilioData.sid}`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(`Error in send-whatsapp-otp: ${err.message}`)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
