
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
    const { email, phone, password, employeeId, name } = await req.json()
    
    if (!phone || !password || !employeeId) {
      throw new Error('Phone, password and employee ID are required')
    }
    
    // Create Supabase client with admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    )
    
    // Create user in auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email || undefined,
      phone,
      password,
      email_confirm: true,
      phone_confirm: false,
      user_metadata: {
        full_name: name,
        is_employee: true,
        employee_id: employeeId
      }
    })
    
    if (authError) {
      console.error('Error creating auth user:', authError)
      throw new Error(`Failed to create user: ${authError.message}`)
    }
    
    const userId = authUser.user.id
    
    // Update profile with employee data
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: name,
        phone_number: phone,
        role: 'employee'
      })
      .eq('id', userId)
    
    if (profileError) {
      console.error('Error updating profile:', profileError)
      throw new Error(`Failed to update profile: ${profileError.message}`)
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Employee auth account created successfully',
        userId
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200 
      }
    )
  } catch (error: any) {
    console.error('Error creating employee auth:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error.message || "Unknown error occurred" 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    )
  }
})
