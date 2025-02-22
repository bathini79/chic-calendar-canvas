
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, password, full_name, phone_number } = await req.json()
    
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

    // Create the user with admin API
    const { data: { user }, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone_number,
        role: 'customer'
      }
    })

    if (createUserError || !user) {
      console.error('Error creating user:', createUserError)
      return new Response(
        JSON.stringify({ error: createUserError?.message || 'Failed to create user' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Insert into profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: user.id,
          email,
          full_name,
          phone_number,
          role: 'customer',
        }
      ])
      .select()
      .single()

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Clean up: delete the created user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(user.id)
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({
        data: {
          ...profile,
          email: user.email
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in create-client function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
