
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.26.0'

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
    const { phoneNumber, employeeId, method = 'whatsapp', fullName } = await req.json()
    
    if (!phoneNumber) {
      throw new Error('Phone number is required')
    }

    // Get base URL for verification links
    const baseUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000'
    
    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    )
    
    // Generate a random 6-digit OTP code
    const generateOTP = () => {
      return Math.floor(100000 + Math.random() * 900000).toString()
    }
    
    const otp = generateOTP()
    const expiresInMinutes = 15
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000)
    
    // Load GupShup configuration
    const gupshupAppId = Deno.env.get('GUPSHUP_APP_ID')
    const gupshupApiKey = Deno.env.get('GUPSHUP_API_KEY')
    const gupshupSourceMobile = Deno.env.get('GUPSHUP_SOURCE_MOBILE')
    
    if (!gupshupAppId || !gupshupApiKey || !gupshupSourceMobile) {
      throw new Error('GupShup credentials are not configured')
    }

    // Log the GupShup configuration for debugging
    console.log('GupShup configuration:', {
      gupshupAppId: gupshupAppId ? 'Configured' : 'Missing',
      gupshupApiKey: gupshupApiKey ? 'Configured' : 'Missing',
      gupshupSourceMobile
    })
    
    let messageResponse
    let storedEntity

    // Handle employee verification flow
    if (employeeId) {
      // Store OTP in database for later verification
      const { error: otpError } = await supabaseAdmin
        .from('employee_verification_codes')
        .insert({
          employee_id: employeeId,
          code: otp,
          expires_at: expiresAt.toISOString()
        })
        
      if (otpError) {
        throw new Error(`Failed to store verification code: ${otpError.message}`)
      }
      
      // Create a verification token for a clickable link
      const verificationToken = crypto.randomUUID()
      
      // Store verification token
      const { error: tokenError } = await supabaseAdmin
        .from('employee_verification_links')
        .insert({
          employee_id: employeeId,
          verification_token: verificationToken,
          expires_at: expiresAt.toISOString()
        })
        
      if (tokenError) {
        console.error('Failed to store verification token:', tokenError)
      }
      
      // Create verification link with token
      const verificationLink = `${baseUrl}/verify?token=${verificationToken}&phone=${encodeURIComponent(phoneNumber)}`
      
      // Create verification link with code
      const codeVerificationLink = `${baseUrl}/verify?code=${otp}&phone=${encodeURIComponent(phoneNumber)}`
      
      // Compose message with verification link
      let message
      
      if (fullName) {
        message = `Hello ${fullName}, 

Your verification code is: *${otp}*

Click the link below to verify your account:
${verificationLink}

This code will expire in ${expiresInMinutes} minutes.

Thank you for joining our team!`
      } else {
        message = `Hello, 

Your verification code is: *${otp}*

Click the link below to verify your account:
${verificationLink}

This code will expire in ${expiresInMinutes} minutes.

Thank you for joining our team!`
      }
      
      // Format phone number for GupShup (remove '+' character)
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;
      
      if (method === 'whatsapp') {
        // Send via GupShup WhatsApp API
        const gupshupEndpoint = 'https://api.gupshup.io/sm/api/v1/msg'
        
        // Create FormData for the request
        const formData = new FormData();
        formData.append('channel', 'whatsapp');
        formData.append('source', gupshupSourceMobile);
        formData.append('destination', formattedPhone);
        formData.append('message', JSON.stringify({
          type: 'text',
          text: message
        }));
        formData.append('app', gupshupAppId);
        
        console.log(`Sending WhatsApp message to: ${formattedPhone} from: ${gupshupSourceMobile}`);

        // Send message using GupShup
        messageResponse = await fetch(gupshupEndpoint, {
          method: 'POST',
          headers: {
            'apikey': gupshupApiKey
          },
          body: formData
        });
      } else {
        // Send via SMS as fallback (still using GupShup)
        console.log(`Sending SMS message to: ${formattedPhone} from: ${gupshupSourceMobile}`);
        
        const smsMessage = `Your verification code is: ${otp}. This code will expire in ${expiresInMinutes} minutes.`;
        
        // Create FormData for the request
        const formData = new FormData();
        formData.append('channel', 'sms');
        formData.append('source', gupshupSourceMobile);
        formData.append('destination', formattedPhone);
        formData.append('message', smsMessage);
        formData.append('app', gupshupAppId);
        
        // Send SMS using GupShup
        messageResponse = await fetch('https://api.gupshup.io/sm/api/v1/msg', {
          method: 'POST',
          headers: {
            'apikey': gupshupApiKey
          },
          body: formData
        });
      }
      
      storedEntity = 'employee'
    } else {
      // Regular user auth flow - store in phone_auth_codes table
      const { error: otpError } = await supabaseAdmin
        .from('phone_auth_codes')
        .insert({
          phone_number: phoneNumber,
          code: otp,
          expires_at: expiresAt.toISOString()
        })
        
      if (otpError) {
        throw new Error(`Failed to store verification code: ${otpError.message}`)
      }
      
      // Format phone number for GupShup (remove '+' character)
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;
      
      if (method === 'whatsapp') {
        // Send via GupShup WhatsApp API
        console.log(`Sending WhatsApp message to: ${formattedPhone} from: ${gupshupSourceMobile}`);
        
        const whatsappMessage = `Your verification code is: *${otp}*. This code will expire in ${expiresInMinutes} minutes.`;
        
        // Create FormData for the request
        const formData = new FormData();
        formData.append('channel', 'whatsapp');
        formData.append('source', gupshupSourceMobile);
        formData.append('destination', formattedPhone);
        formData.append('message', JSON.stringify({
          type: 'text',
          text: whatsappMessage
        }));
        formData.append('app', gupshupAppId);
        
        // Send message using GupShup
        messageResponse = await fetch('https://api.gupshup.io/sm/api/v1/msg', {
          method: 'POST',
          headers: {
            'apikey': gupshupApiKey
          },
          body: formData
        });
      } else {
        // Send via SMS as fallback (still using GupShup)
        console.log(`Sending SMS message to: ${formattedPhone} from: ${gupshupSourceMobile}`);
        
        const smsMessage = `Your verification code is: ${otp}. This code will expire in ${expiresInMinutes} minutes.`;
        
        // Create FormData for the request
        const formData = new FormData();
        formData.append('channel', 'sms');
        formData.append('source', gupshupSourceMobile);
        formData.append('destination', formattedPhone);
        formData.append('message', smsMessage);
        formData.append('app', gupshupAppId);
        
        // Send SMS using GupShup
        messageResponse = await fetch('https://api.gupshup.io/sm/api/v1/msg', {
          method: 'POST',
          headers: {
            'apikey': gupshupApiKey
          },
          body: formData
        });
      }
      
      storedEntity = 'user'
    }
    
    // Check if message was sent successfully
    if (!messageResponse.ok) {
      const errorData = await messageResponse.json()
      throw new Error(`Failed to send message: ${JSON.stringify(errorData)}`)
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Verification code sent to ${phoneNumber}`,
        entity: storedEntity
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
    console.error('Error sending OTP:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Unknown error occurred" 
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
