import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const NOTIFICATION_TYPES = {
  BOOKING_CONFIRMATION: "booking_confirmation",
  APPOINTMENT_CONFIRMED: "confirmed",
  REMINDER_1_HOUR: "reminder_1_hour",
  REMINDER_4_HOURS: "reminder_4_hours",
  APPOINTMENT_COMPLETED: "completed",
  APPOINTMENT_NO_SHOW: "noshow",
  APPOINTMENT_CANCELLED: "canceled"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const { 
      appointmentId, 
      notificationType = NOTIFICATION_TYPES.BOOKING_CONFIRMATION, 
      notificationId,
      preferredProvider // Optional parameter to specify which provider to use
    } = await req.json();

    if (!appointmentId) throw new Error("Appointment ID is required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL"), 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Fetch appointment details
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from("appointments")
      .select(`
        id,
        customer_id,
        start_time,
        end_time,
        status,
        location,
        profiles:customer_id (
          full_name,
          phone_number
        ),
        bookings (
          id,
          service_id,
          package_id,
          services:service_id ( name ),
          packages:package_id ( name )
        )
      `)
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment?.profiles?.phone_number) {
      throw new Error("Invalid appointment or missing phone number");
    }

    // Format message details
    const servicesText = appointment.bookings
      .map((b) => b.services?.name || b.packages?.name)
      .filter(Boolean)
      .join(", ");

    const dateObj = new Date(appointment.start_time);
    const formattedDate = dateObj.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
    
    const formattedTime = dateObj.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit"
    });

    let locationName = "our salon";
    if (appointment.location) {
      const { data: locData } = await supabaseAdmin
        .from("locations")
        .select("name")
        .eq("id", appointment.location)
        .single();

      if (locData?.name) locationName = locData.name;
    }

    const customerName = appointment.profiles.full_name;
    let message = `Hello ${customerName},\n\n`;

    switch (notificationType) {
      case NOTIFICATION_TYPES.BOOKING_CONFIRMATION:
        message += `Thanks for booking! Your appointment is scheduled at ${locationName} on ${formattedDate} at ${formattedTime}.\n\nService(s): ${servicesText}\nSee you soon!`;
        break;
      case NOTIFICATION_TYPES.APPOINTMENT_CONFIRMED:
        message += `Your appointment at ${locationName} has been confirmed for ${formattedDate} at ${formattedTime}.\n\nService(s): ${servicesText}`;
        break;
      case NOTIFICATION_TYPES.REMINDER_1_HOUR:
        message += `Reminder: Your appointment at ${locationName} is in 1 hour at ${formattedTime}.\n\nService(s): ${servicesText}`;
        break;
      case NOTIFICATION_TYPES.REMINDER_4_HOURS:
        message += `Reminder: Your appointment is in 4 hours on ${formattedDate} at ${formattedTime}.\n\nService(s): ${servicesText}`;
        break;
      case NOTIFICATION_TYPES.APPOINTMENT_COMPLETED:
        message += `Thanks for visiting ${locationName} today. We hope you enjoyed your ${servicesText}. See you again!`;
        break;
      case NOTIFICATION_TYPES.APPOINTMENT_NO_SHOW:
        message += `We noticed you missed your appointment at ${locationName} on ${formattedDate}. If you'd like to reschedule, let us know!`;
        break;
      case NOTIFICATION_TYPES.APPOINTMENT_CANCELLED:
        message += `Your appointment at ${locationName} on ${formattedDate} has been cancelled. We hope to see you soon.`;
        break;
      default:
        message += `Reminder for your upcoming appointment at ${locationName} on ${formattedDate} at ${formattedTime}.`;
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
        notificationId,
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

    return new Response(JSON.stringify({
      success: true,
      messageId: result.messageId,
      provider: result.provider
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("Error:", error);
    
    // Attempt to mark the notification as failed
    try {
      const { notificationId } = await req.json();
      if (notificationId) {
        const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
        await supabaseAdmin.from("notification_queue").update({
          status: "failed",
          processed_at: new Date().toISOString(),
          error_message: error.message
        }).eq("id", notificationId);
      }
    } catch (_) {}
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Unknown error"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
