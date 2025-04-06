
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
    const { notificationId } = await req.json()
    
    if (!notificationId) {
      throw new Error('Notification ID is required')
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    
    // Get the notification details
    const { data: notification, error: notificationError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('id', notificationId)
      .single()
      
    if (notificationError) {
      throw new Error(`Failed to retrieve notification: ${notificationError.message}`)
    }
    
    if (!notification) {
      throw new Error('Notification not found')
    }
    
    if (notification.status !== 'pending') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Notification already ${notification.status}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Get GupShup configuration from messaging_providers settings
    const { data: gupshupConfig, error: configError } = await supabase
      .from('messaging_providers')
      .select('*')
      .eq('provider_name', 'gupshup')
      .single()
    
    if (configError || !gupshupConfig) {
      throw new Error('GupShup is not configured')
    }

    if (!gupshupConfig.is_active) {
      throw new Error('GupShup integration is not active')
    }

    const { app_id, api_key, source_mobile } = gupshupConfig.configuration

    if (!app_id || !api_key || !source_mobile) {
      throw new Error('Incomplete GupShup configuration')
    }
    
    // Format phone number for GupShup (ensure no '+' character)
    const formattedPhone = notification.recipient_number.startsWith('+') 
      ? notification.recipient_number.substring(1) 
      : notification.recipient_number;
    
    console.log(`Sending WhatsApp message to: ${formattedPhone} from: ${source_mobile}`);
    
    // Create FormData for the request
    const formData = new FormData();
    formData.append('channel', 'whatsapp');
    formData.append('source', source_mobile);
    formData.append('destination', formattedPhone);
    formData.append('message', JSON.stringify({
      type: 'text',
      text: notification.message_content
    }));
    formData.append('app', app_id);
    
    // Send message using GupShup
    const messageResponse = await fetch('https://api.gupshup.io/sm/api/v1/msg', {
      method: 'POST',
      headers: {
        'apikey': api_key
      },
      body: formData
    });
    
    // Check if message was sent successfully
    if (!messageResponse.ok) {
      const errorData = await messageResponse.json()
      
      // Update notification status to failed
      await supabase
        .from('notification_queue')
        .update({ 
          status: 'failed',
          processed_at: new Date().toISOString(),
          error_message: JSON.stringify(errorData)
        })
        .eq('id', notification.id)
        
      throw new Error(`Failed to send message: ${JSON.stringify(errorData)}`)
    }
    
    // Get response data to extract message ID
    const responseData = await messageResponse.json()
    console.log('GupShup API response:', JSON.stringify(responseData, null, 2))
    
    // Update notification status to sent
    await supabase
      .from('notification_queue')
      .update({ 
        status: 'sent',
        processed_at: new Date().toISOString(),
        external_message_id: responseData.messageId || null
      })
      .eq('id', notification.id)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        messageId: responseData.messageId || null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error: any) {
    console.error('Error sending notification:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Failed to send notification" 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Using 200 to avoid CORS issues with error responses
      }
    )
  }
})
