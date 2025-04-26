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
    const { 
      appointmentId, 
      message, 
      notificationType = 'bill_receipt',
      preferredProvider // Optional parameter to specify which provider to use
    } = await req.json();

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

    // Send the message using the unified send-whatsapp-message function
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        phoneNumber: appointment.profiles.phone_number,
        message,
        appointmentId,
        notificationType,
        preferredProvider
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send WhatsApp message: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Bill notification sent successfully",
        messageId: result.messageId,
        provider: result.provider
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