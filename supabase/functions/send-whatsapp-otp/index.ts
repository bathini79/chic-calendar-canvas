
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  
  const formData = new URLSearchParams()
  formData.append('From', `whatsapp:${TWILIO_PHONE_NUMBER}`)
  formData.append('To', `whatsapp:${phoneNumber}`)
  formData.append('Body', `Your verification code is: ${otp}`)

  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
  
  const response = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`
    },
    body: formData
  })

  return response.json()
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio credentials not configured')
    }
    
    // Parse request body
    const { phoneNumber } = await req.json()
    
    if (!phoneNumber) {
      throw new Error('Phone number is required')
    }
    
    // Generate OTP
    const otp = generateOTP()
    
    // Store OTP in database for verification
    const supabaseClient = Deno.env.get('SUPABASE_URL') && Deno.env.get('SUPABASE_ANON_KEY')
      ? createClient(
          Deno.env.get('SUPABASE_URL') as string,
          Deno.env.get('SUPABASE_ANON_KEY') as string,
          { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )
      : null
      
    if (supabaseClient) {
      // Store OTP with expiration (10 minutes)
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + 10)
      
      const { error } = await supabaseClient
        .from('phone_auth_codes')
        .upsert({
          phone_number: phoneNumber,
          code: otp,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        })
        
      if (error) throw error
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

function createClient(supabaseUrl: string, supabaseKey: string, options: any) {
  return {
    from: (table: string) => ({
      upsert: (data: any) => {
        return fetch(`${supabaseUrl}/rest/v1/${table}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(data)
        }).then(response => {
          if (!response.ok) {
            return { error: { message: `HTTP error! status: ${response.status}` } }
          }
          return { error: null }
        }).catch(error => {
          return { error }
        })
      }
    })
  }
}
