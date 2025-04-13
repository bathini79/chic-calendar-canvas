
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.26.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
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
    const { phoneNumber, fullName, lead_source } = await req.json();
    
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
    
    // Check if user already exists
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();
    
    // Load GupShup configuration
    const { data: providerConfigData, error: providerConfigError } = await supabaseAdmin
      .from('messaging_providers')
      .select('configuration')
      .eq('provider_name', 'gupshup')
      .single();
      
    if (providerConfigError || !providerConfigData?.configuration) {
      console.error("Provider config error:", providerConfigError);
      throw new Error('Gupshup config not found in message_providers');
    }
    
    // Store OTP in database
    const { error: otpError } = await supabaseAdmin
      .from('phone_auth_codes')
      .insert({
        phone_number: phoneNumber,
        code: otp,
        expires_at: expiresAt.toISOString(),
        full_name: fullName,
        lead_source: lead_source
      });
      
    if (otpError) {
      console.error("OTP storage error:", otpError);
      throw new Error(`Failed to store verification code: ${otpError.message}`);
    }
    
    // Get GupShup configuration
    const config = providerConfigData.configuration;
    
    // Create message with verification code
    const MESSAGE_TEXT = `Your verification code for Salon App is: ${otp}\n\nThis code will expire in ${expiresInMinutes} minutes.`;
    
    const GUPSHUP_API_KEY = config.api_key;
    const SOURCE_NUMBER = config.source_mobile.startsWith('+') ? config.source_mobile.slice(1) : config.source_mobile;
    const APP_NAME = config.app_name;
    
    const url = "https://api.gupshup.io/wa/api/v1/msg";
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "apikey": GUPSHUP_API_KEY
    };
    
    // Ensure number is formatted correctly - don't add + prefix
    const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber.slice(1) : phoneNumber;
    
    const formData = new URLSearchParams();
    formData.append("channel", "whatsapp");
    formData.append("source", SOURCE_NUMBER);
    formData.append("destination", formattedPhoneNumber);
    formData.append("message", JSON.stringify({
      type: "text",
      text: MESSAGE_TEXT
    }));
    formData.append("src.name", APP_NAME);
    
    console.log("Sending to:", formattedPhoneNumber);
    console.log("Message content:", MESSAGE_TEXT);
    
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData.toString()
    });
    
    const responseBody = await response.json();
    
    if (!response.ok) {
      console.error("Gupshup API error:", responseBody);
      throw new Error(`Gupshup API error: ${JSON.stringify(responseBody)}`);
    }
    
    console.log("Gupshup API success:", responseBody);
    
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
      error: error.message || "An unknown error occurred"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
