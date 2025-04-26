import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.26.0'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Supabase client with admin privileges
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') as string,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    
    // Handle webhook verification from Meta
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode')
      const token = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')
      
      // Fetch the verify token from the database
      const { data: providerConfig, error: configError } = await supabaseAdmin
        .from('messaging_providers')
        .select('configuration')
        .eq('provider_name', 'meta_whatsapp')
        .single()
      
      if (configError) {
        console.error('Error fetching Meta WhatsApp configuration:', configError)
        return new Response(
          JSON.stringify({ success: false, error: 'Configuration not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      const verifyToken = providerConfig.configuration.verify_token
      
      // Verify the webhook
      if (mode === 'subscribe' && token === verifyToken) {
        console.log('Meta WhatsApp webhook verified')
        return new Response(challenge, { 
          headers: { 'Content-Type': 'text/plain' },
          status: 200 
        })
      } else {
        console.error('Failed to verify webhook:', { mode, token })
        return new Response(
          JSON.stringify({ success: false, error: 'Verification failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }
    }
    
    // Handle incoming webhook events (POST method)
    if (req.method === 'POST') {
      const payload = await req.json()
      console.log('Received Meta WhatsApp webhook:', JSON.stringify(payload))
      
      // Get the Meta WhatsApp configuration
      const { data: providerConfig, error: configError } = await supabaseAdmin
        .from('messaging_providers')
        .select('configuration, is_active')
        .eq('provider_name', 'meta_whatsapp')
        .single()
      
      if (configError || !providerConfig.is_active) {
        console.error('Meta WhatsApp integration not configured or not active')
        return new Response(
          JSON.stringify({ success: false, error: 'Integration not configured or not active' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
      
      // Process the webhook payload
      // Check if this is a WhatsApp Business Account message
      if (payload.object === 'whatsapp_business_account') {
        for (const entry of payload.entry) {
          // Process changes in this entry
          for (const change of entry.changes) {
            if (change.field === 'messages') {
              const value = change.value
              
              // Process messages
              if (value.messages && value.messages.length > 0) {
                for (const message of value.messages) {
                  await processIncomingMessage(message, value.metadata.phone_number_id, providerConfig.configuration)
                }
              }
              
              // Process message status updates
              if (value.statuses && value.statuses.length > 0) {
                for (const status of value.statuses) {
                  await processMessageStatus(status, value.metadata.phone_number_id)
                }
              }
            }
          }
        }
      }
      
      // Always return a 200 response to acknowledge receipt
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }
    
    // Handle other HTTP methods
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
    
  } catch (error) {
    console.error('Error handling Meta WhatsApp webhook:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

/**
 * Process an incoming message from WhatsApp
 */
async function processIncomingMessage(message, phoneNumberId, config) {
  try {
    // Get the sender's phone number
    const fromPhone = message.from
    
    // Get the message content
    let messageContent = ''
    
    if (message.type === 'text' && message.text) {
      messageContent = message.text.body
    } else if (message.type === 'image' && message.image) {
      messageContent = 'Image message'
    } else if (message.type === 'audio' && message.audio) {
      messageContent = 'Audio message'
    } else if (message.type === 'document' && message.document) {
      messageContent = 'Document message'
    } else {
      messageContent = `${message.type} message`
    }
    
    console.log(`Received message from ${fromPhone}: ${messageContent}`)
    
    // Store the message in the database for audit purposes
    await supabaseAdmin.from('whatsapp_messages').insert({
      provider: 'meta_whatsapp',
      direction: 'inbound',
      from_number: fromPhone,
      to_number: phoneNumberId, // The phone number ID receiving the message
      message_content: messageContent,
      message_type: message.type,
      raw_payload: message,
      status: 'received'
    })
    
    // Check if this is an employee verification code
    if (messageContent.toLowerCase().startsWith('verify:')) {
      await handleEmployeeVerification(fromPhone, messageContent, config)
      return
    }
    
    // Add more message handling logic as needed
    
  } catch (error) {
    console.error('Error processing incoming message:', error)
  }
}

/**
 * Process message status updates
 */
async function processMessageStatus(status, phoneNumberId) {
  try {
    // Status can be sent, delivered, read, failed
    const statusType = status.status
    const messageId = status.id
    const recipientPhone = status.recipient_id
    
    console.log(`Message ${messageId} to ${recipientPhone} status: ${statusType}`)
    
    // Update message status in database
    await supabaseAdmin.from('whatsapp_messages')
      .update({ 
        status: statusType,
        status_timestamp: new Date().toISOString()
      })
      .eq('message_id', messageId)
    
    // Also update appointment_notifications if this was a notification
    const { data: notificationData } = await supabaseAdmin
      .from('appointment_notifications')
      .select('id')
      .eq('message_id', messageId)
      .maybeSingle()
    
    if (notificationData) {
      await supabaseAdmin
        .from('appointment_notifications')
        .update({ 
          status: statusType === 'failed' ? 'failed' : 
                 statusType === 'delivered' ? 'delivered' : 
                 statusType === 'read' ? 'read' : 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationData.id)
    }
    
  } catch (error) {
    console.error('Error processing message status:', error)
  }
}

/**
 * Handle employee verification code
 */
async function handleEmployeeVerification(fromPhone, messageContent, config) {
  try {
    // Extract verification code from the message
    const code = messageContent.toLowerCase().replace('verify:', '').trim()
    
    if (!code) {
      await sendWhatsAppReply(
        fromPhone, 
        'Invalid verification format. Please send "verify:YOUR_CODE"', 
        config
      )
      return
    }
    
    // Call the employee verification endpoint
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-employee-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        code,
        phoneNumber: fromPhone
      })
    })
    
    const verificationResult = await response.json()
    
    // Send a reply based on verification result
    if (verificationResult.success) {
      // Get employee name
      const { data: employeeData } = await supabaseAdmin
        .from('employees')
        .select('name')
        .eq('id', verificationResult.employeeId)
        .single()
      
      const name = employeeData?.name || 'Staff member'
      
      // Send success message
      await sendWhatsAppReply(
        fromPhone,
        `Thank you, ${name}! Your staff account has been successfully verified and activated.`,
        config
      )
    } else {
      // Send failure message
      await sendWhatsAppReply(
        fromPhone,
        `Verification failed: ${verificationResult.message}. Please contact your administrator.`,
        config
      )
    }
    
  } catch (error) {
    console.error('Error handling employee verification:', error)
    
    // Send error message
    await sendWhatsAppReply(
      fromPhone,
      'An error occurred while processing your verification. Please try again later or contact support.',
      config
    )
  }
}

/**
 * Send a WhatsApp message using the Meta WhatsApp Cloud API
 */
async function sendWhatsAppReply(phoneNumber, message, config) {
  try {
    // Format the phone number correctly for the API
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
    
    // Prepare the message data
    const messageData = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "text",
      text: { 
        body: message 
      }
    }
    
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
    )
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(`Meta API error: ${JSON.stringify(result)}`)
    }
    
    // Store the sent message in the database
    if (result.messages && result.messages[0] && result.messages[0].id) {
      await supabaseAdmin.from('whatsapp_messages').insert({
        provider: 'meta_whatsapp',
        direction: 'outbound',
        from_number: config.phone_number_id,
        to_number: phoneNumber,
        message_content: message,
        message_type: 'text',
        message_id: result.messages[0].id,
        raw_payload: result,
        status: 'sent'
      })
    }
    
    return result
    
  } catch (error) {
    console.error('Error sending WhatsApp reply:', error)
    throw error
  }
}