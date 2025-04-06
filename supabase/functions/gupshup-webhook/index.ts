
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.26.0'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const data = await req.json()
    console.log('Received webhook:', JSON.stringify(data, null, 2))

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Process the webhook data based on type
    // This is a simple implementation - expand as needed
    if (data.type === 'message') {
      // Handle incoming message
      const { app, payload, timestamp } = data
      const { sender, messageId, type, payload: messagePayload } = payload || {}
      
      // Log the message to your database
      await supabase
        .from('gupshup_messages')
        .insert({
          message_id: messageId,
          sender: sender.phone,
          message_type: type,
          content: JSON.stringify(messagePayload),
          app_id: app,
          timestamp: new Date(timestamp).toISOString()
        })
    }
    else if (data.type === 'message-event') {
      // Handle message delivery status updates
      const { payload } = data
      const { id, destAddr, eventType, eventTs } = payload || {}
      
      // Update the status in your database
      await supabase
        .from('notification_queue')
        .update({
          status: mapGupshupStatus(eventType),
          processed_at: new Date(eventTs).toISOString(),
          error_message: eventType === 'failed' ? 'Message delivery failed' : null,
          external_message_id: id
        })
        .eq('external_message_id', id)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error: any) {
    console.error('Error processing GupShup webhook:', error)
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Using 200 to avoid webhook retries, even for errors
      }
    )
  }
})

// Map GupShup status to our application status
function mapGupshupStatus(gupshupStatus: string): 'pending' | 'sent' | 'failed' {
  switch (gupshupStatus.toLowerCase()) {
    case 'sent':
    case 'delivered':
      return 'sent'
    case 'failed':
    case 'undelivered':
      return 'failed'
    default:
      return 'pending'
  }
}
