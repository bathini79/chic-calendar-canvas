
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse incoming webhook from Twilio
    // For webhook format, reference: https://www.twilio.com/docs/messaging/webhooks
    const formData = await req.formData()
    
    // Get the message body and from phone number
    const messageBody = formData.get('Body')?.toString() || ''
    let fromPhone = formData.get('From')?.toString() || ''
    
    // Extract the phone number part from "whatsapp:+1234567890"
    fromPhone = fromPhone.replace('whatsapp:', '')
    
    // Check if the message looks like a verification code (6 digits)
    const codeMatch = messageBody.match(/\b\d{6}\b/)
    if (!codeMatch) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "No verification code found in message" 
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
    
    const code = codeMatch[0]
    
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    )
    
    // Call our verification function
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-employee-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        code,
        phoneNumber: fromPhone
      })
    })
    
    const verificationResult = await response.json()
    
    // Send a reply to the user
    if (verificationResult.success) {
      // Get employee name
      const { data: employeeData } = await supabaseAdmin
        .from('employees')
        .select('name')
        .eq('id', verificationResult.employeeId)
        .single()
      
      const name = employeeData?.name || 'Staff member'
      
      // Send success message
      await sendWhatsAppMessage(fromPhone, `Thank you, ${name}! Your staff account has been successfully verified and activated.`)
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Employee verified successfully"
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          },
          status: 200 
        }
      )
    } else {
      // Send failure message
      await sendWhatsAppMessage(fromPhone, `Verification failed: ${verificationResult.message}. Please contact your administrator.`)
      
      return new Response(
        JSON.stringify({
          success: false,
          message: verificationResult.message
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
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    
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

async function sendWhatsAppMessage(phoneNumber: string, message: string) {
  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber.replace(/\s/g, '')}`
  
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  
  const formData = new URLSearchParams()
  formData.append('From', `whatsapp:${TWILIO_PHONE_NUMBER}`)
  formData.append('To', `whatsapp:${formattedPhone}`)
  formData.append('Body', message)

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
