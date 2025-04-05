
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
    const { phoneNumber, code, fullName, lead_source } = await req.json()
    
    if (!phoneNumber || !code) {
      throw new Error('Phone number and verification code are required')
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase credentials not configured')
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })    
    
    // Verify OTP from database
    const { data, error } = await supabaseAdmin
      .from('phone_auth_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('code', code)
      .single()
      
    if (error || !data) {
      console.error('OTP verification error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'invalid_code',
          message: 'Invalid verification code'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Using 200 to avoid non-2xx handling issues
        }
      )
    }
    
    // Check if OTP has expired
    const expiresAt = new Date(data.expires_at)
    const currentTime = new Date()
    
    if (currentTime > expiresAt) {
      console.error('OTP expired')
      return new Response(
        JSON.stringify({ 
          error: 'code_expired',
          message: 'Verification code has expired'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Using 200 to avoid non-2xx handling issues
        }
      )
    }
    
    // Check if user exists
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone_number', phoneNumber)
      .single()
    
    let userId = null
    let newUser = false
    let session = null
    
    if (userError || !existingUser) {
      // Creating a new user requires a full name
      if (!fullName) {
        // Return specific error for missing name but with 200 status code
        return new Response(
          JSON.stringify({ 
            error: "new_user_requires_name",
            message: "New user registration requires a full name"
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 // Using 200 to avoid non-2xx handling issues
          }
        )
      }
      
      try {
        // First create the auth user
        const { data: newAuthUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          phone: phoneNumber,
          phone_confirm: true,
          email_confirm: true,
          user_metadata: { 
            full_name: fullName,
            phone_verified: true
          }
        })
        
        if (createUserError) {
          console.error('Error creating auth user:', createUserError)
          return new Response(
            JSON.stringify({ 
              error: "user_creation_failed",
              message: "Failed to create user account",
              details: createUserError.message
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 // Using 200 to avoid non-2xx handling issues
            }
          )
        }
        
        if (!newAuthUser || !newAuthUser.user) {
          throw new Error('User creation returned no user data')
        }
        
        userId = newAuthUser.user.id
        newUser = true        
        
        // Manually create profile since the trigger might not work in all cases
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            phone_number: phoneNumber, // Ensure phone number is saved in profile
            phone_verified: true,
            full_name: fullName,
            lead_source: lead_source || null,
            role: 'customer'
          })
          
        if (profileError) {
          console.error('Error creating profile:', profileError)
          // We don't fail here since the auth user was already created,
          // the profile might be created by a trigger
        }
        
        // Create session for the new user
        const { data: sessionData, error: signInError } = await supabaseAdmin.auth.admin.signInWithPhone({
          phone: phoneNumber,
          user_id: userId
        })
        
        if (signInError) {
          console.error('Error signing in new user:', signInError)
        } else {
          session = sessionData
        }
        
      } catch (createError) {
        console.error('Exception during user creation:', createError)
        return new Response(
          JSON.stringify({ 
            error: "user_creation_exception",
            message: "Failed to create user account due to an exception",
            details: createError.message
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 // Using 200 to avoid non-2xx handling issues
          }
        )
      }
    } else {
      userId = existingUser.id
      
      // Sign in existing user
      const { data: sessionData, error: signInError } = await supabaseAdmin.auth.admin.signInWithPhone({
        phone: phoneNumber,
        user_id: userId
      })
      
      if (signInError) {
        console.error('Error signing in existing user:', signInError)
        return new Response(
          JSON.stringify({ 
            error: "signin_failed",
            message: "Failed to sign in user",
            details: signInError.message
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 // Using 200 to avoid non-2xx handling issues
          }
        )
      }
      
      session = sessionData
    }
    
    // Delete used OTP
    const { error: deleteError } = await supabaseAdmin
      .from('phone_auth_codes')
      .delete()
      .eq('phone_number', phoneNumber)
      
    if (deleteError) {
      console.warn('Error deleting used OTP:', deleteError)
      // Not failing on this error, just logging
    }
    
    return new Response(
      JSON.stringify({ 
        message: newUser ? 'Registration successful' : 'Login successful',
        isNewUser: newUser,
        user: { id: userId, phone_number: phoneNumber },
        session: session
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error verifying OTP:', error)
    
    return new Response(
      JSON.stringify({ 
        error: "unknown_error", 
        message: error.message || "Unknown error occurred",
        details: error.stack
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200 // Using 200 to avoid non-2xx handling issues
      }
    )
  }
})
