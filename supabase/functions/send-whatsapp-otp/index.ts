
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.26.0'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateOTP() {
  // Generate a 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendWhatsAppOTP(phoneNumber: string, otp: string) {
  // Make sure the phone number is in E.164 format
  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
  
  console.log(`Attempting to send OTP to: ${formattedPhone} using Twilio WhatsApp`)
  
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  
  const formData = new URLSearchParams()
  formData.append('From', `whatsapp:${TWILIO_PHONE_NUMBER}`)
  formData.append('To', `whatsapp:${formattedPhone}`)
  formData.append('Body', `Your verification code is: ${otp}`)

  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
  
  try {
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      body: formData
    })
    
    const responseData = await response.json()
    
    if (!response.ok) {
      console.error('Error from Twilio:', responseData)
      throw new Error(`Twilio API error: ${responseData.message || responseData.error_message || 'Unknown error'}`)
    }
    
    console.log('Twilio message sent successfully:', responseData.sid)
    return responseData
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error)
    throw error
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Twilio credentials missing:', {
        ACCOUNT_SID_EXISTS: !!TWILIO_ACCOUNT_SID,
        AUTH_TOKEN_EXISTS: !!TWILIO_AUTH_TOKEN,
        PHONE_NUMBER_EXISTS: !!TWILIO_PHONE_NUMBER
      })
      throw new Error('Twilio credentials not configured')
    }
    
    // Parse request body
    const { phoneNumber } = await req.json()
    
    if (!phoneNumber) {
      throw new Error('Phone number is required')
    }

    console.log(`Processing OTP request for phone: ${phoneNumber}`)
    
    // Generate OTP
    const otp = generateOTP()
    console.log(`Generated OTP: ${otp} for phone: ${phoneNumber}`)
    
    // Store OTP in database for verification
    const supabaseClient = Deno.env.get('SUPABASE_URL') && Deno.env.get('SUPABASE_ANON_KEY')
      ? createClient(
          Deno.env.get('SUPABASE_URL') as string,
          Deno.env.get('SUPABASE_ANON_KEY') as string,
          { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )
      : null
      
    if (supabaseClient) {
      try {
        // First, delete any existing OTP for this phone number
        await supabaseClient
          .from('phone_auth_codes')
          .delete()
          .eq('phone_number', phoneNumber);
        
        // Then store the new OTP with expiration (10 minutes)
        const expiresAt = new Date()
        expiresAt.setMinutes(expiresAt.getMinutes() + 10)
        
        const { error } = await supabaseClient
          .from('phone_auth_codes')
          .insert({
            phone_number: phoneNumber,
            code: otp,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
          })
          
        if (error) {
          console.error('Error storing OTP in database:', error)
          throw error
        }
        
        console.log(`OTP stored in database for phone: ${phoneNumber}`)
      } catch (error) {
        console.error('Database operation failed:', error)
        throw new Error(`Failed to store OTP: ${error.message}`)
      }
    }
    
    // Send OTP via WhatsApp
    await sendWhatsAppOTP(phoneNumber, otp)
    
    return new Response(
      JSON.stringify({ message: 'OTP sent successfully' }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error sending OTP:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 400 
      }
    )
  }
})
