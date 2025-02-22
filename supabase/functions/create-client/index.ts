
import { serve } from "https://deno.fresh.dev/std@v9.6.1/http/server.ts"
import { createClient } from '@supabase/supabase-js'

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
    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse the request body
    const { email, password, full_name, phone_number } = await req.json()

    // Create the user
    const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone_number }
    })

    if (createUserError) {
      console.error('Error creating user:', createUserError)
      return new Response(
        JSON.stringify({ 
          error: createUserError.message 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the profile data
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return new Response(
        JSON.stringify({ 
          error: 'Error fetching profile data'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Return the success response
    return new Response(
      JSON.stringify({
        data: {
          ...profileData,
          email: userData.user.email,
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in create-client function:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
