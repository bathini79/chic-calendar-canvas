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
      preferredProvider // Optional parameter to specify which provider to use
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

    // Determine which messaging provider to use
    let providerName = preferredProvider || 'meta_whatsapp'; // Default to Meta if not specified
    
    // Get active messaging providers
    const { data: providers, error: providersError } = await supabaseAdmin
      .from('messaging_providers')
      .select('provider_name, is_active, configuration')
      .eq('is_active', true);
    
    if (providersError) {
      throw new Error(`Failed to fetch messaging providers: ${providersError.message}`);
    }
    
    // Check if Meta WhatsApp is the preferred or active provider
    const metaProvider = providers.find(p => p.provider_name === 'meta_whatsapp' && p.is_active);
    
    // Check if Gupshup is the preferred or active provider
    const gupshupProvider = providers.find(p => p.provider_name === 'gupshup' && p.is_active);
    
    // Determine which provider to use based on preference and availability
    if (preferredProvider) {
      // Use the specified provider if it exists and is active
      const preferredProviderConfig = providers.find(p => p.provider_name === preferredProvider && p.is_active);
      if (!preferredProviderConfig) {
        if (preferredProvider === 'meta_whatsapp' && gupshupProvider) {
          // Fallback to Gupshup if Meta is preferred but not available
          providerName = 'gupshup';
        } else if (preferredProvider === 'gupshup' && metaProvider) {
          // Fallback to Meta if Gupshup is preferred but not available
          providerName = 'meta_whatsapp';
        } else {
          throw new Error(`Preferred provider ${preferredProvider} is not available and no fallback exists`);
        }
      }
    } else {
      // Auto-select based on availability
      if (metaProvider) {
        providerName = 'meta_whatsapp';
      } else if (gupshupProvider) {
        providerName = 'gupshup';
      } else {
        throw new Error('No active WhatsApp messaging provider available');
      }
    }
    
    // Get the selected provider configuration
    const selectedProvider = providers.find(p => p.provider_name === providerName);
    
    if (!selectedProvider) {
      throw new Error(`Selected provider ${providerName} configuration not found`);
    }

    // Send the message using the appropriate provider
    let result;
    if (providerName === 'meta_whatsapp') {
      result = await sendMetaWhatsAppMessage(phoneNumber, message, selectedProvider.configuration, supabaseAdmin);
    } else if (providerName === 'gupshup') {
      result = await sendGupshupMessage(phoneNumber, message, selectedProvider.configuration, supabaseAdmin);
    } else {
      throw new Error(`Unsupported provider: ${providerName}`);
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

    return new Response(JSON.stringify({
      success: true,
      messageId: result.messageId,
      provider: providerName
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    
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