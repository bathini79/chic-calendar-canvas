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
      throw new Error('No active WhatsApp messaging providers available');
    }
    
    // Find the active providers we support
    const metaProvider = activeProviders.find(p => p.provider_name === 'meta_whatsapp');
    const gupshupProvider = activeProviders.find(p => p.provider_name === 'gupshup');
    
    // Determine which provider to use
    let providerName;
    let selectedProvider;
    
    if (preferredProvider) {
      // If a preferred provider is specified, try to use it if it's active
      selectedProvider = activeProviders.find(p => p.provider_name === preferredProvider);
      
      if (selectedProvider) {
        // Use the preferred provider if it's active
        providerName = preferredProvider;
      } else {
        // If preferred provider isn't active, use any available provider as fallback
        if (preferredProvider === 'meta_whatsapp' && gupshupProvider) {
          providerName = 'gupshup';
          selectedProvider = gupshupProvider;
        } else if (preferredProvider === 'gupshup' && metaProvider) {
          providerName = 'meta_whatsapp';
          selectedProvider = metaProvider;
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
      } else {
        throw new Error('No supported WhatsApp messaging provider is active');
      }
    }
    
    if (!selectedProvider) {
      throw new Error(`No active provider found for ${providerName}`);
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