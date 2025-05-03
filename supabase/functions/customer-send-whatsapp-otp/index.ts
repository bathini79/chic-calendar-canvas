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
    const { phoneNumber, fullName, lead_source, baseUrl } = await req.json();
    
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
    
    console.log("Customer login OTP request for phone:", phoneNumber);
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    // Get preferred messaging provider for OTP delivery
    const { data: otpProvider } = await supabaseAdmin
      .from('messaging_providers')
      .select('provider_name')
      .eq('is_otp_provider', true)
      .eq('is_active', true)
      .maybeSingle();

    // Determine preferred provider based on admin settings
    const preferredOtpProvider = otpProvider?.provider_name || 'meta_whatsapp';
    const useSMS = preferredOtpProvider === 'twofactor';
    
    console.log("Using OTP provider:", preferredOtpProvider, "SMS mode:", useSMS);
    
    // Generate a random 6-digit OTP code
    const generateOTP = () => {
      return Math.floor(100000 + Math.random() * 900000).toString();
    };
    
    const otp = generateOTP();
    const expiresInMinutes = 15;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    
    // Normalize the phone number - strip "+" prefix for consistent storage
    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;
    
    // Check if user already exists
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .single();
    
    // Store the OTP in the database
    const { error: otpError } = await supabaseAdmin.from('phone_auth_codes').insert({
      phone_number: normalizedPhone,
      code: otp,
      expires_at: expiresAt.toISOString(),
      full_name: fullName,
      lead_source: lead_source
    });
    
    if (otpError) {
      throw new Error(`Failed to store verification code: ${otpError.message}`);
    }
    
    // Create message with OTP
    const MESSAGE_TEXT = `Your verification code for login is: ${otp}\n\nThis code will expire in ${expiresInMinutes} minutes.`;
    console.log("Sending login OTP message to:", normalizedPhone);
    
    let response;
    let responseBody;
    
    // Route to the appropriate sending method based on provider preference
    if (useSMS) {
      // For 2Factor.in, use the dedicated SMS endpoint
      response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-twofactor-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          phoneNumber,
          message: MESSAGE_TEXT,
          otpCode: otp,
          notificationType: 'otp_verification'
        })
      });
    } else {
      // For WhatsApp providers, use the centralized send-whatsapp-message function
      response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          message: MESSAGE_TEXT,
          preferredProvider: preferredOtpProvider,
          fallbackToSMS: true,
          isOTP: true,
          notificationType: "otp_verification"
        })
      });
    }
    
    responseBody = await response.json();
    
    if (!response.ok || (responseBody.error && !responseBody.success)) {
      console.error("OTP sending error for customer login:", responseBody);
      throw new Error(`OTP sending error: ${responseBody.error || JSON.stringify(responseBody)}`);
    }
    
    console.log("OTP message sent successfully for customer login via", responseBody.provider || preferredOtpProvider);
    
    return new Response(JSON.stringify({
      success: true,
      provider: responseBody.provider || preferredOtpProvider,
      messageId: responseBody.messageId,
      isSMS: useSMS || responseBody.isSMS,
      userData: existingUser // Include user data in the response if they exist
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error in customer-send-whatsapp-otp:", error);
    
    return new Response(JSON.stringify({
      error: error.message || "Unknown error occurred"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
