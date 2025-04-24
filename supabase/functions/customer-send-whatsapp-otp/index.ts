
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
    
    // Load GupShup configuration
    const { data: providerConfigData, error: providerConfigError } = await supabaseAdmin
      .from('messaging_providers')
      .select('configuration')
      .eq('provider_name', 'gupshup')
      .single();
    
    if (providerConfigError || !providerConfigData?.configuration) {
      throw new Error('Gupshup config not found in message_providers');
    }
    
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
    
    const config = providerConfigData.configuration;
    
    // Create message with OTP
    const MESSAGE_TEXT = `Your verification code for login is: ${otp}\n\nThis code will expire in ${expiresInMinutes} minutes.`;
    console.log("Sending login OTP message to:", normalizedPhone);
    
    const GUPSHUP_API_KEY = config.api_key;
    const SOURCE_NUMBER = config.source_mobile.startsWith('+') ? config.source_mobile.slice(1) : config.source_mobile;
    const url = "https://api.gupshup.io/wa/api/v1/msg";
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "apikey": GUPSHUP_API_KEY
    };
    
    // Ensure number is formatted correctly - don't add + prefix
    const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber.slice(1) : phoneNumber;
    const APP_NAME = config.app_name;
    
    const formData = new URLSearchParams();
    formData.append("channel", "whatsapp");
    formData.append("source", SOURCE_NUMBER);
    formData.append("destination", formattedPhoneNumber);
    formData.append("message", JSON.stringify({
      type: "text",
      text: MESSAGE_TEXT
    }));
    formData.append("src.name", APP_NAME);
    
    console.log("Sending login OTP to:", formattedPhoneNumber);
    
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData.toString()
    });
    
    const responseBody = await response.json();
    
    if (!response.ok) {
      console.error("Gupshup API error for customer login:", responseBody);
      throw new Error(`Gupshup API error: ${JSON.stringify(responseBody)}`);
    }
    
    console.log("Gupshup API success for customer login OTP:", responseBody);
    
    return new Response(JSON.stringify({
      success: true,
      response: responseBody,
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
