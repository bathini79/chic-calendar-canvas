import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.26.0';

// Define CORS headers
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

  // Only allow POST requests
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
    // Parse the request body
    const { 
      phoneNumber, 
      message, 
      notificationId, 
      appointmentId,
      notificationType,
      preferredProvider, // Optional parameter to specify which provider to use
      fallbackToSMS = true, // New parameter to control SMS fallback behavior
      isOTP = false // Whether this message contains an OTP code
    } = await req.json();

    // Validate required parameters
    if (!phoneNumber || !message) {
      return new Response(JSON.stringify({
        success: false,
        error: "Missing required parameters: phoneNumber and message are required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Create Supabase client with admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    );

    // Get active messaging providers
    const { data: providers, error: providersError } = await supabaseAdmin
      .from('messaging_providers')
      .select('provider_name, is_active, configuration');
    
    if (providersError) {
      throw new Error(`Failed to fetch messaging providers: ${providersError.message}`);
    }
    
    console.log("Available providers:", JSON.stringify(providers));
    
    // Filter to only get active providers - IMPORTANT: Only use providers that are marked as active
    const activeProviders = providers.filter(p => p.is_active === true);
    
    console.log("Active providers:", JSON.stringify(activeProviders));
    
    if (activeProviders.length === 0) {
      throw new Error('No active messaging providers available');
    }
    
    // Find the active providers we support
    const metaProvider = activeProviders.find(p => p.provider_name === 'meta_whatsapp');
    const gupshupProvider = activeProviders.find(p => p.provider_name === 'gupshup');
    const twofactorProvider = activeProviders.find(p => p.provider_name === 'twofactor');
    
    // Determine which provider to use
    let providerName;
    let selectedProvider;
    let isSMSProvider = false;
    
    // If SMS is explicitly requested
    if (preferredProvider === 'twofactor' || preferredProvider === 'sms') {
      if (twofactorProvider) {
        providerName = 'twofactor';
        selectedProvider = twofactorProvider;
        isSMSProvider = true;
      } else {
        throw new Error('SMS provider (2Factor.in) is not active');
      }
    } 
    else if (preferredProvider) {
      // If a specific WhatsApp provider is specified, try to use it
      selectedProvider = activeProviders.find(p => p.provider_name === preferredProvider);
      
      if (selectedProvider) {
        // Use the preferred provider if it's active
        providerName = preferredProvider;
      } else {
        // If preferred provider isn't active, use any available WhatsApp provider as fallback
        if (preferredProvider === 'meta_whatsapp' && gupshupProvider) {
          providerName = 'gupshup';
          selectedProvider = gupshupProvider;
        } else if (preferredProvider === 'gupshup' && metaProvider) {
          providerName = 'meta_whatsapp';
          selectedProvider = metaProvider;
        } else if (fallbackToSMS && twofactorProvider) {
          // Fallback to SMS if WhatsApp providers are not available
          providerName = 'twofactor';
          selectedProvider = twofactorProvider;
          isSMSProvider = true;
        } else {
          throw new Error(`Preferred provider ${preferredProvider} is not active and no fallback is available`);
        }
      }
    } else {
      // Auto-select based on availability, prioritizing Meta WhatsApp
      if (metaProvider) {
        providerName = 'meta_whatsapp';
        selectedProvider = metaProvider;
      } else if (gupshupProvider) {
        providerName = 'gupshup';
        selectedProvider = gupshupProvider;
      } else if (fallbackToSMS && twofactorProvider) {
        // Fallback to SMS if no WhatsApp providers are available
        providerName = 'twofactor';
        selectedProvider = twofactorProvider;
        isSMSProvider = true;
      } else {
        throw new Error('No supported messaging provider is active');
      }
    }
    
    if (!selectedProvider) {
      throw new Error(`No active provider found for ${providerName}`);
    }

    // Send the message using the appropriate provider
    let result;
    try {
      if (providerName === 'meta_whatsapp') {
        result = await sendMetaWhatsAppMessage(phoneNumber, message, selectedProvider.configuration, supabaseAdmin);
      } else if (providerName === 'gupshup') {
        result = await sendGupshupMessage(phoneNumber, message, selectedProvider.configuration, supabaseAdmin);
      } else if (providerName === 'twofactor') {
        // For OTP messages, extract the OTP code from the message
        let otpCode = null;
        if (isOTP) {
          // Try to extract OTP from the message - looking for a 6-digit code
          const otpMatch = message.match(/\b\d{6}\b/);
          if (otpMatch) {
            otpCode = otpMatch[0];
          }
        }
        
        result = await sendTwoFactorSMS(phoneNumber, message, otpCode, selectedProvider.configuration, supabaseAdmin);
      } else {
        throw new Error(`Unsupported provider: ${providerName}`);
      }
    } catch (sendError) {
      // If WhatsApp sending fails and SMS fallback is enabled, try SMS
      if (!isSMSProvider && fallbackToSMS && twofactorProvider) {
        console.log(`Falling back to SMS after ${providerName} failure:`, sendError.message);
        try {
          // For OTP messages, extract the OTP code from the message
          let otpCode = null;
          if (isOTP) {
            // Try to extract OTP from the message - looking for a 6-digit code
            const otpMatch = message.match(/\b\d{6}\b/);
            if (otpMatch) {
              otpCode = otpMatch[0];
            }
          }
          
          result = await sendTwoFactorSMS(phoneNumber, message, otpCode, twofactorProvider.configuration, supabaseAdmin);
          providerName = 'twofactor';
          isSMSProvider = true;
        } catch (smsError) {
          console.error('SMS fallback also failed:', smsError);
          throw new Error(`All message delivery attempts failed. Last error: ${smsError.message}`);
        }
      } else {
        console.error(`Error sending message via ${providerName}:`, sendError);
        throw new Error(`Failed to send message: ${sendError.message}`);
      }
    }

    // Update notification status if applicable
    if (notificationId) {
      await supabaseAdmin.from("notification_queue").update({
        status: "sent",
        processed_at: new Date().toISOString(),
        message_id: result.messageId,
        provider: providerName
      }).eq("id", notificationId);
    }
    
    // Create an appointment notification record if appointmentId is provided
    if (appointmentId) {
      await supabaseAdmin
        .from('appointment_notifications')
        .insert({
          appointment_id: appointmentId,
          notification_type: notificationType || 'message',
          status: 'sent',
          recipient: phoneNumber,
          message_id: result.messageId,
          provider: providerName
        });
    }
    
    // Record employee-related notifications (verification or welcome messages)
    if (notificationType === 'verification_link' || notificationType === 'welcome_message' || notificationType === 'otp_verification') {
      try {
        await supabaseAdmin.from('whatsapp_messages').insert({
          provider: providerName,
          direction: 'outbound',
          to_number: phoneNumber,
          message_content: message,
          message_type: 'text',
          message_id: result.messageId,
          notification_type: notificationType,
          status: 'sent'
        });
      } catch (recordError) {
        console.error(`Error recording ${notificationType} in database:`, recordError);
        // Don't throw here, still consider the message as sent even if recording fails
      }
    }

    return new Response(JSON.stringify({
      success: true,
      messageId: result.messageId,
      provider: providerName,
      isSMS: isSMSProvider
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("Error sending message:", error);
    
    return new Response(JSON.stringify({
      success: false,
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

/**
 * Send a message using Meta WhatsApp Cloud API
 */
async function sendMetaWhatsAppMessage(phoneNumber, message, config, supabaseAdmin) {
  try {
    // Format the phone number correctly for the API
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    
    // Prepare the message data
    const messageData = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "text",
      text: { 
        body: message 
      }
    };
    
    // Send the message using Meta WhatsApp Cloud API
    const response = await fetch(
      `https://graph.facebook.com/${config.api_version}/${config.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.access_token}`
        },
        body: JSON.stringify(messageData)
      }
    );
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`Meta API error: ${JSON.stringify(result)}`);
    }
    
    // Get the message ID from the response
    const messageId = result.messages && result.messages[0] ? result.messages[0].id : null;
    
    if (!messageId) {
      throw new Error('Failed to get message ID from Meta WhatsApp API response');
    }
    
    // Store the sent message in the database
    try {
      await supabaseAdmin.from('whatsapp_messages').insert({
        provider: 'meta_whatsapp',
        direction: 'outbound',
        from_number: config.phone_number_id,
        to_number: phoneNumber,
        message_content: message,
        message_type: 'text',
        message_id: messageId,
        raw_payload: result,
        status: 'sent'
      });
    } catch (dbError) {
      console.error('Error storing WhatsApp message in database:', dbError);
      // Continue despite database error
    }
    
    return { 
      success: true, 
      messageId,
      rawResponse: result
    };
    
  } catch (error) {
    console.error('Error sending WhatsApp message via Meta:', error);
    throw error;
  }
}

/**
 * Send a message using Gupshup
 */
async function sendGupshupMessage(phoneNumber, message, config, supabaseAdmin) {
  try {
    // Format the phone number for Gupshup (without + prefix)
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber.slice(1) : phoneNumber;
    
    // Format source number
    const SOURCE_NUMBER = config.source_mobile.startsWith('+') ? 
      config.source_mobile.slice(1) : config.source_mobile;
    
    // Prepare the Gupshup payload
    const gupshupPayload = new URLSearchParams({
      channel: "whatsapp",
      source: SOURCE_NUMBER,
      destination: formattedPhone,
      message: JSON.stringify({
        type: "text",
        text: message
      }),
      "src.name": config.app_name
    });
    
    // Send the message using Gupshup API
    const response = await fetch("https://api.gupshup.io/wa/api/v1/msg", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apikey: config.api_key
      },
      body: gupshupPayload.toString()
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`Gupshup API error: ${JSON.stringify(result)}`);
    }
    
    // Store the sent message in the database
    try {
      await supabaseAdmin.from('whatsapp_messages').insert({
        provider: 'gupshup',
        direction: 'outbound',
        from_number: SOURCE_NUMBER,
        to_number: formattedPhone,
        message_content: message,
        message_type: 'text',
        message_id: result.messageId,
        raw_payload: result,
        status: 'sent'
      });
    } catch (dbError) {
      console.error('Error storing WhatsApp message in database:', dbError);
      // Continue despite database error
    }
    
    return { 
      success: true, 
      messageId: result.messageId,
      rawResponse: result
    };
    
  } catch (error) {
    console.error('Error sending WhatsApp message via Gupshup:', error);
    throw error;
  }
}

/**
 * Send a message using 2Factor.in SMS API
 */
async function sendTwoFactorSMS(phoneNumber, message, otpCode, config, supabaseAdmin) {
  try {
    // Format the phone number for 2Factor (without + prefix)
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber.slice(1) : phoneNumber;
    
    let apiUrl = '';
    let result = null;
    
    // If an OTP code is provided, use it for verification
    if (otpCode) {
      // Use template if provided, otherwise use default OTP template
      if (config.template_name) {
        apiUrl = `https://2factor.in/API/V1/${config.api_key}/SMS/${formattedPhone}/${otpCode}/${config.template_name}`;
      } else {
        apiUrl = `https://2factor.in/API/V1/${config.api_key}/SMS/${formattedPhone}/${otpCode}`;
      }
    } else {
      // For regular text messages, use sendSMS endpoint
      apiUrl = `https://2factor.in/API/V1/${config.api_key}/ADDON_SERVICES/SEND/TSMS`;
      
      // Create payload for non-OTP messages
      const smsPayload = {
        From: config.sender_id,
        To: formattedPhone,
        Msg: message
      };
      
      // Send using POST method for custom messages
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(smsPayload)
      });
      
      result = await response.json();
      
      if (!response.ok || result.Status !== 'Success') {
        throw new Error(result.Details || 'Failed to send SMS');
      }
    }
    
    // For OTP messages, use the GET endpoint
    if (otpCode && !result) {
      const response = await fetch(apiUrl);
      result = await response.json();
      
      if (!response.ok || result.Status !== 'Success') {
        throw new Error(result.Details || 'Failed to send SMS');
      }
    }
    
    // Use the session ID as the message ID
    const messageId = result.Details || (`sms_${Date.now()}`);
    
    // Store the sent message in the database
    try {
      await supabaseAdmin.from('whatsapp_messages').insert({
        provider: 'twofactor_sms',
        direction: 'outbound',
        from_number: config.sender_id,
        to_number: formattedPhone,
        message_content: otpCode ? `OTP: ${otpCode}` : message,
        message_type: 'text',
        message_id: messageId,
        raw_payload: result,
        status: 'sent',
        status_timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('Error storing SMS message in database:', dbError);
      // Continue despite database error
    }
    
    return { 
      success: true, 
      messageId,
      rawResponse: result
    };
    
  } catch (error) {
    console.error('Error sending SMS via 2Factor:', error);
    throw error;
  }
}