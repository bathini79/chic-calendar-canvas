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
    
    // Use the centralized send-whatsapp-message function to send the OTP
    // This supports both Meta WhatsApp and Gupshup providers
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        phoneNumber: phoneNumber,
        message: MESSAGE_TEXT,
        notificationType: "otp_verification"
      })
    });
    
    const responseBody = await response.json();
    
    if (!response.ok || !responseBody.success) {
      console.error("WhatsApp API error for customer login:", responseBody);
      throw new Error(`WhatsApp API error: ${JSON.stringify(responseBody)}`);
    }
    
    console.log("WhatsApp message sent successfully for customer login OTP via", responseBody.provider);
    
    return new Response(JSON.stringify({
      success: true,
      provider: responseBody.provider,
      messageId: responseBody.messageId,
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
