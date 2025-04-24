
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
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateVerificationToken() {
  // Generate a random string of 32 characters
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sendWhatsAppOTP(phoneNumber: string, otp: string, name: string, verificationToken: string, baseUrl: string) {
  // Make sure the phone number is in E.164 format
  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber.replace(/\s/g, '')}`
  
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  
  // Create the verification link
  const verificationLink = `${baseUrl}/verify?token=${verificationToken}&code=${otp}`;
  
  const formData = new URLSearchParams()
  formData.append('From', `whatsapp:${TWILIO_PHONE_NUMBER}`)
  formData.append('To', `whatsapp:${formattedPhone}`)
  formData.append('Body', `Hello ${name}, your verification code to activate your staff account is: ${otp}. Click on this link to verify: ${verificationLink}`)

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
      throw new Error(`Twilio API error: ${responseData.message || responseData.error_message || JSON.stringify(responseData)}`)
    }
    
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
    // Check if Twilio credentials are available
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Twilio credentials missing:', {
        ACCOUNT_SID_EXISTS: !!TWILIO_ACCOUNT_SID,
        AUTH_TOKEN_EXISTS: !!TWILIO_AUTH_TOKEN,
        PHONE_NUMBER_EXISTS: !!TWILIO_PHONE_NUMBER
      })
      throw new Error('Twilio credentials not configured')
    }
    
    // Parse request body
    const { phoneNumber, employeeId, name, baseUrl } = await req.json()
    
    if (!phoneNumber || !employeeId) {
      throw new Error('Phone number and employee ID are required')
    }

    // Base URL is required to generate verification links
    if (!baseUrl) {
      throw new Error('Base URL is required for verification links')
    }
    
    // Generate OTP and verification token
    const otp = generateOTP()
    const verificationToken = generateVerificationToken()
    
    // Create Supabase client with admin privileges
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    )
      
    // First, check if the employee exists
    const { data: employeeData, error: employeeError } = await supabaseClient
      .from('employees')
      .select('id, name')
      .eq('id', employeeId)
      .single()
    
    if (employeeError || !employeeData) {
      console.error('Employee not found:', employeeError)
      throw new Error('Employee not found with the provided ID')
    }
    
    // Delete any existing OTP for this employee
    await supabaseClient
      .from('employee_verification_codes')
      .delete()
      .eq('employee_id', employeeId)
    
    // Delete any existing verification links for this employee
    await supabaseClient
      .from('employee_verification_links')
      .delete()
      .eq('employee_id', employeeId)
    
    // Store the verification token
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour expiration for links
    
    const { error: tokenError } = await supabaseClient
      .from('employee_verification_links')
      .insert({
        employee_id: employeeId,
        verification_token: verificationToken,
        expires_at: expiresAt.toISOString(),
        used: false
      })
      
    if (tokenError) {
      console.error('Error storing verification token:', tokenError)
      throw new Error(`Failed to store verification token: ${tokenError.message}`)
    }
    
    // Then store the new OTP with expiration (1 hour)
    const otpExpiresAt = new Date()
    otpExpiresAt.setHours(otpExpiresAt.getHours() + 1)
    
    const { error: insertError } = await supabaseClient
      .from('employee_verification_codes')
      .insert({
        employee_id: employeeId,
        code: otp,
        expires_at: otpExpiresAt.toISOString()
      })
      
    if (insertError) {
      console.error('Error storing OTP in database:', insertError)
      throw new Error(`Failed to store OTP: ${insertError.message}`)
    }
    
    // Send OTP via WhatsApp with verification link
    await sendWhatsAppOTP(phoneNumber, otp, name || employeeData.name, verificationToken, baseUrl)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification code sent successfully',
        employeeId: employeeId,
        verificationToken: verificationToken
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200 
      }
    )
  } catch (error: any) {
    console.error('Error sending verification:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error.message || "Unknown error occurred" 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200 
      }
    )
  }
})
