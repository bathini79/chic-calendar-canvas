import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.26.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders
      }
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      error: "Method not allowed"
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  try {
    const { 
      phoneNumber, 
      fullName, 
      lead_source, 
      baseUrl
    } = await req.json();

    if (!phoneNumber) {
      return new Response(JSON.stringify({
        error: "Missing phoneNumber parameter"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'), 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    // Get preferred messaging provider for OTP delivery
    const { data: otpProvider } = await supabaseAdmin
      .from('messaging_providers')
      .select('provider_name')
      .eq('is_otp_provider', true)
      .maybeSingle();

    // Determine preferred provider based on admin settings (default to WhatsApp if not set)
    const preferredOtpProvider = otpProvider?.provider_name || 'meta_whatsapp';
    const forceSMS = preferredOtpProvider === 'twofactor';

    // Generate a random 6-digit OTP code
    const generateOTP = () => {
      return Math.floor(100000 + Math.random() * 900000).toString();
    };
    
    const otp = generateOTP();
    const expiresInMinutes = 15;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    
    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();
    
    // Store the OTP code in the database
    const { error: otpError } = await supabaseAdmin.from('phone_auth_codes').insert({
      phone_number: phoneNumber,
      code: otp,
      expires_at: expiresAt.toISOString(),
      full_name: fullName,
      lead_source: lead_source
    });
    
    if (otpError) {
      throw new Error(`Failed to store verification code: ${otpError.message}`);
    }
    
    // Create verification link (must be URL-encoded)
    const verificationParams = new URLSearchParams({
      phone: phoneNumber,
      code: otp
    });
    
    // Use customer verification page for the link
    const verificationUrl = `${baseUrl}/customer-verify?${verificationParams.toString()}`;
    
    let response;
    let result;
    
    // Check if we should use SMS directly based on admin preference
    if (forceSMS) {
      // For SMS, send just the OTP code with a simple message (no link)
      const smsMessage = `${fullName ? `Hello ${fullName}, ` : ''}Your verification code is: ${otp}. This code will expire in ${expiresInMinutes} minutes.`;
      
      // Use the dedicated 2Factor.in SMS endpoint
      response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-twofactor-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          phoneNumber,
          message: smsMessage,
          otpCode: otp,
          notificationType: 'otp_verification'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to send SMS: ${errorData.error || response.statusText}`);
      }
      
      result = await response.json();
    } else {
      // Create WhatsApp message with verification link
      const whatsappMessage = `Please verify your phone number by clicking this link: ${verificationUrl}\n\nOr use code: ${otp}\n\nThis code will expire in ${expiresInMinutes} minutes.`;
      
      console.log("Sending message with verification link:", verificationUrl);

      // Send the message using the unified send-whatsapp-message function
      response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          phoneNumber,
          message: whatsappMessage,
          fallbackToSMS: true, // Always attempt SMS fallback for OTP codes
          isOTP: true, // Indicate this contains an OTP code
          notificationType: 'otp_verification'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to send verification message: ${errorData.error || response.statusText}`);
      }
      
      result = await response.json();
    }
    
    return new Response(JSON.stringify({
      success: true,
      response: result,
      userData: existingUser, // Include user data in the response if they exist
      provider: result.provider,
      isSMS: result.isSMS || forceSMS
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
    
  } catch (error) {
    console.error("Error in send-whatsapp-otp:", error);
    
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
