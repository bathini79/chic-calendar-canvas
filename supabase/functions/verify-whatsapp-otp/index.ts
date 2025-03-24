
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
    const { phoneNumber, code, fullName } = await req.json()
    
    if (!phoneNumber || !code) {
      throw new Error('Phone number and verification code are required')
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase credentials not configured')
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
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
          status: 200 // Using 200 even for errors to avoid non-2xx handling issues
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
          status: 200 // Using 200 even for errors to avoid non-2xx handling issues
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
    
    if (userError || !existingUser) {
      console.log('New user detected')
      // Creating a new user requires a full name
      if (!fullName) {
        console.log('New user registration requires full name')
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

      console.log('Creating new user with name:', fullName, 'and phone:', phoneNumber)
      
      try {
        // Create a new user
        const { data: user, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
          phone: phoneNumber,
          phone_confirm: true,
          user_metadata: { 
            phone_verified: true,
            full_name: fullName
          }
        })
        
        if (signUpError) {
          console.error('Error creating user:', signUpError)
          return new Response(
            JSON.stringify({ 
              error: "user_creation_failed",
              message: "Failed to create user account",
              details: signUpError.message
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 // Using 200 to avoid non-2xx handling issues
            }
          )
        }
        
        if (!user || !user.user) {
          throw new Error('User creation returned no user data')
        }
        
        userId = user.user.id
        newUser = true
        
        // Create profile for new user
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            phone_number: phoneNumber,
            phone_verified: true,
            full_name: fullName,
            role: 'customer'
          })
          
        if (profileError) {
          console.error('Error creating profile:', profileError)
          return new Response(
            JSON.stringify({ 
              error: "profile_creation_failed",
              message: "Failed to create user profile",
              details: profileError.message
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 // Using 200 to avoid non-2xx handling issues
            }
          )
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
    }
    
    // Sign in the user and get session
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.signInWithPhone({
      phone: phoneNumber,
      createUser: false
    })
    
    if (sessionError) {
      console.error('Error signing in:', sessionError)
      return new Response(
        JSON.stringify({ 
          error: "signin_failed",
          message: "Failed to sign in user",
          details: sessionError.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Using 200 to avoid non-2xx handling issues
        }
      )
    }
    
    // Delete used OTP
    await supabaseAdmin
      .from('phone_auth_codes')
      .delete()
      .eq('phone_number', phoneNumber)
    
    return new Response(
      JSON.stringify({ 
        message: newUser ? 'Registration successful' : 'Login successful',
        isNewUser: newUser,
        user: { id: userId, phone_number: phoneNumber }
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
