import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { phoneNumber, message, otpCode = '', notificationType = 'otp_verification' } = await req.json();

    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    if (!message) {
      throw new Error("Message template is required");
    }

    // Create Supabase client with admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    );

    // Get 2Factor API key from environment variables or database
    // Retrieve 2Factor API configuration from the database
    const { data: twoFactorConfig, error: configError } = await supabaseAdmin
      .from('messaging_providers')
      .select('configuration')
      .eq('provider_name', 'twofactor')
      .single();

    if (configError) {
      throw new Error(`Failed to get 2Factor configuration: ${configError.message}`);
    }

    if (!twoFactorConfig?.configuration?.api_key) {
      throw new Error("2Factor API key not found in configuration");
    }

    const apiKey = twoFactorConfig.configuration.api_key;
    
    // Generate a new OTP if one wasn't provided
    const otp = otpCode || generateOTP();
    
    // Store OTP in database
    if (!otpCode) {
      // Make sure the phone number format is correct (without + prefix)
      const normalizedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber.substring(1) 
        : phoneNumber;
      
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15); // OTP expires in 15 minutes
      
      // Store in phone_auth_codes table for verification
      const { error: insertError } = await supabaseAdmin
        .from('phone_auth_codes')
        .insert({
          phone_number: normalizedPhone,
          code: otp,
          expires_at: expiresAt.toISOString()
        });
      
      if (insertError) {
        throw new Error(`Failed to store OTP: ${insertError.message}`);
      }
    }
    
    // Replace {{otp}} in message template with the actual OTP
    const finalMessage = message.replace('{{otp}}', otp);
    
    // Format phone number for API call (remove '+' if present)
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;
    
    // Call 2Factor API to send SMS
    const apiUrl = `https://2factor.in/API/V1/${apiKey}/SMS/${formattedPhone}/${otp}/OTP1`;
    
    const response = await fetch(apiUrl);
    const responseData = await response.json();
    
    // Check if the API call was successful
    if (response.ok && responseData.Status === 'Success') {
      // Log the successful SMS in the database
      try {
        await supabaseAdmin.from('sms_messages').insert({
          provider: 'twofactor',
          to_number: formattedPhone,
          message_content: finalMessage.replace(otp, '******'), // Mask OTP in logs
          status: 'sent',
          notification_type: notificationType,
          session_id: responseData.Details || '',
          status_timestamp: new Date().toISOString(),
          raw_payload: responseData
        });
      } catch (logError) {
        // Don't fail the operation if logging fails
        console.error('Error logging SMS message:', logError);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "SMS sent successfully", 
          sessionId: responseData.Details
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
          status: 200 
        }
      );
    } else {
      // Log the failed SMS attempt
      try {
        await supabaseAdmin.from('sms_messages').insert({
          provider: 'twofactor',
          to_number: formattedPhone,
          message_content: finalMessage.replace(otp, '******'), // Mask OTP in logs
          status: 'failed',
          notification_type: notificationType,
          error_details: JSON.stringify(responseData),
          status_timestamp: new Date().toISOString(),
          raw_payload: responseData
        });
      } catch (logError) {
        console.error('Error logging SMS failure:', logError);
      }
      
      throw new Error(`Failed to send SMS: ${JSON.stringify(responseData)}`);
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to send SMS"
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200 // Using 200 with error in body for consistent client handling
      }
    );
  }
});

// Helper function to generate a 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}