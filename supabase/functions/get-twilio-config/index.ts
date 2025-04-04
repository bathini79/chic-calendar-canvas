
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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verify admin role - only admins should be able to access this
    const { data: { user } } = await supabaseClient.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    // Get admin status
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      
    if (profileError || !profileData || !['admin', 'superadmin'].includes(profileData.role)) {
      throw new Error('Unauthorized: Admin access required')
    }
    
    // Get Twilio configuration from system_settings table
    const { data, error } = await supabaseClient
      .from('system_settings')
      .select('settings, is_active')
      .eq('category', 'twilio')
      .maybeSingle()
    
    if (error) {
      throw new Error(`Failed to retrieve Twilio configuration: ${error.message}`)
    }
    
    if (!data) {
      return new Response(
        JSON.stringify({ 
          accountSid: '',
          authToken: '',
          phoneNumber: '',
          isActive: false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }
    
    // Return the Twilio configuration
    const twilioConfig = {
      accountSid: data.settings?.accountSid || '',
      authToken: data.settings?.authToken || '',
      phoneNumber: data.settings?.phoneNumber || '',
      isActive: data.is_active || false
    }
    
    return new Response(
      JSON.stringify(twilioConfig),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error: any) {
    console.error('Error retrieving Twilio config:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      }
    )
  }
})
