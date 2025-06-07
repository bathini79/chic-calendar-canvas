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
    
    // Check if employee exists
    const { data: employeeData, error: employeeCheckError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .single()
      
    if (employeeCheckError || !employeeData) {
      throw new Error(`Employee with ID ${employeeId} not found`)
    }
    
    // Create user in auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email || undefined,
      phone,
      password,
      email_confirm: true,
      phone_confirm: false,
      raw_user_meta_data: {
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
    
    console.log("Employee auth user created with ID:", userId);
    
    // Create/update profile with employee data
    // Wait a short time for auth triggers to run
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if profile already exists (created by database trigger)
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (existingProfile) {
      console.log('Profile already exists, updating with employee information:', userId);
      
      // Update the existing profile with employee fields
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name: name,
          phone_number: phone,
          phone_verified: true,
          role: 'employee',
          last_used: new Date().toISOString()
        })
        .eq('id', userId);
        
      if (updateError) {
        console.error('Error updating profile with employee information:', updateError);
        throw new Error(`Failed to update profile: ${updateError.message}`);
      } else {
        console.log('Successfully updated profile with employee information');
      }
    } else {
      // Try to create a new profile if none exists
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          user_id: userId,
          full_name: name,
          phone_number: phone,
          phone_verified: true,
          role: 'employee',
          wallet_balance: 0,
          last_used: new Date().toISOString()
        });
        
      if (profileError) {
        console.log('Profile insert error, trying again with update:', profileError);
        
        // If insert fails, try updating as a last resort
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            full_name: name,
            phone_number: phone,
            phone_verified: true,
            role: 'employee',
            last_used: new Date().toISOString()
          })
          .eq('id', userId);
          
        if (updateError) {
          console.error('All profile creation/update attempts failed:', updateError);
          throw new Error(`Failed to create/update profile: ${updateError.message}`);
        }
      } else {
        console.log('Successfully created new employee profile');
      }
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
