import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const { appointmentId, message, notificationType = 'bill_receipt' } = await req.json();

    if (!appointmentId) throw new Error("Appointment ID is required");
    if (!message) throw new Error("Message is required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Fetch appointment details to get customer phone number
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from("appointments")
      .select(`
        id,
        customer_id,
        profiles:customer_id (
          full_name,
          phone_number
        )
      `)
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment?.profiles?.phone_number) {
      throw new Error("Invalid appointment or missing phone number");
    }

    // Fetch Gupshup config from message_providers table
    const { data: providerConfigData, error: providerConfigError } = await supabaseAdmin
      .from('messaging_providers')
      .select('configuration')
      .eq('provider_name', 'gupshup')
      .single();
      
    if (providerConfigError || !providerConfigData?.configuration) {
      throw new Error('Gupshup config not found in message_providers');
    }
    
    const gupshupConfig = providerConfigData.configuration;
    const GUPSHUP_API_KEY = gupshupConfig.api_key;
    const SOURCE_NUMBER = gupshupConfig.source_mobile.startsWith("+") ? 
      gupshupConfig.source_mobile.slice(1) : gupshupConfig.source_mobile;
    const SRC_NAME = gupshupConfig.app_name;

    // Format phone number for Gupshup
    const formattedPhone = appointment.profiles.phone_number.startsWith("+") ? 
      appointment.profiles.phone_number.slice(1) : appointment.profiles.phone_number;

    // Create notification record in the database
    const { data: notification, error: notificationError } = await supabaseAdmin
      .from('appointment_notifications')
      .insert({
        appointment_id: appointmentId,
        notification_type: notificationType,
        status: 'pending',
        recipient: formattedPhone,
      })
      .select()
      .single();

    if (notificationError) throw notificationError;

    // Send message via Gupshup WhatsApp API
    const gupshupPayload = new URLSearchParams({
      channel: "whatsapp",
      source: SOURCE_NUMBER,
      destination: formattedPhone,
      message: JSON.stringify({
        type: "text",
        text: message
      }),
      "src.name": SRC_NAME
    });

    const gupshupResponse = await fetch("https://api.gupshup.io/wa/api/v1/msg", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apikey: GUPSHUP_API_KEY
      },
      body: gupshupPayload.toString()
    });

    const result = await gupshupResponse.json();

    if (!gupshupResponse.ok) {
      throw new Error(`Gupshup API error: ${JSON.stringify(result)}`);
    }

    // Update notification status
    await supabaseAdmin
      .from('appointment_notifications')
      .update({ 
        status: 'sent',
        processed_at: new Date().toISOString(),
        message_id: result.messageId
      })
      .eq("id", notification.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Bill notification sent successfully",
        messageId: result.messageId
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error sending bill notification:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});