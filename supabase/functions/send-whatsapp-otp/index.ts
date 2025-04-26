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
      baseUrl,
      preferredProvider // Optional parameter to specify which provider to use
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
    
    // Create message with verification link
    const message = `Please verify your phone number by clicking this link: ${verificationUrl}\n\nOr use code: ${otp}\n\nThis code will expire in ${expiresInMinutes} minutes.`;
    
    console.log("Sending message with verification link:", verificationUrl);

    // Send the message using the unified send-whatsapp-message function
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        phoneNumber,
        message,
        preferredProvider
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send WhatsApp message: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      response: result,
      userData: existingUser, // Include user data in the response if they exist
      provider: result.provider
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
