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
    
    // Step 1: Verify OTP from database
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('phone_auth_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('code', code)
      .single()
      
    if (otpError || !otpData) {
      console.error('OTP verification error:', otpError)
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
    const expiresAt = new Date(otpData.expires_at)
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
          status: 200
        }
      )
    }
    
    // Step 2: Check if user exists by phone number (just the phone, no need to check profiles as the trigger will handle it)
    const { data: existingUser, error: userError } = await supabaseAdmin.auth.admin.listUsers({
      phone: phoneNumber
    });
    
    let userId = null
    let isNewUser = false
    let credentials = null
    
    // Step 3: Handle authentication based on whether user exists
    if (!existingUser || existingUser.users.length === 0) {
      // New user registration
      isNewUser = true
      
      // New user requires fullName
      if (!fullName) {
        return new Response(
          JSON.stringify({ 
            error: "new_user_requires_name",
            message: "New user registration requires a full name"
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }
      
      try {
        // Create a unique email based on phone number - use normalized phone without the +
        const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber.slice(1) : phoneNumber;
        const email = `${normalizedPhone}@phone.user`
        
        // Generate a random password
        const password = crypto.randomUUID()
        
        // Create new user with phone number and metadata
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          phone: phoneNumber,
          email: email,
          password: password,
          phone_confirm: true,
          email_confirm: true,
          user_metadata: { 
            full_name: fullName,
            phone_verified: true,
            phone: phoneNumber,  // Add phone to metadata explicitly
            lead_source: lead_source
          }
        })
        
        if (createError) {
          console.error('Error creating user:', createError)
          return new Response(
            JSON.stringify({ 
              error: "user_creation_failed",
              message: "User creation failed",
              details: createError.message
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          )
        }
        
        userId = newUser.user.id
        
        // Return credentials for frontend to create session
        credentials = {
          email: email,
          password: password
        }
      } catch (error) {
        console.error('Unexpected error in user creation:', error);
        return new Response(
          JSON.stringify({ 
            error: "user_creation_failed",
            message: "User creation failed",
            details: error.message || "Unexpected error"
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }
    } else {
      // Existing user - direct sign in
      const user = existingUser.users[0]
      userId = user.id
      
      // Extract email from user data
      const email = user.email
      
      // Generate a one-time password for this login
      const tempPassword = crypto.randomUUID()
      
      // Update the user's metadata with lead_source if provided
      const updatedMetadata = {
        ...user.user_metadata,
        phone: phoneNumber,  // Ensure phone is in metadata
      };
      
      if (lead_source) {
        updatedMetadata.lead_source = lead_source;
      }
      
      // Update the user's password and metadata
      const { error: passwordUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { 
          password: tempPassword,
          user_metadata: updatedMetadata
        }
      )
      
      if (passwordUpdateError) {
        console.error('Error updating user password:', passwordUpdateError)
        return new Response(
          JSON.stringify({ 
            error: "password_update_failed",
            message: "Failed to update user credentials"
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }
      
      // Return credentials for frontend to create session
      credentials = {
        email: email,
        password: tempPassword
      }
    }
    
    // Delete used OTP
    await supabaseAdmin
      .from('phone_auth_codes')
      .delete()
      .eq('phone_number', phoneNumber)
    
    // Return user data and credentials
    return new Response(
      JSON.stringify({ 
        message: isNewUser ? 'Registration successful' : 'Login successful',
        isNewUser: isNewUser,
        userId: userId,
        phoneNumber: phoneNumber,
        credentials: credentials,
        fullName: fullName,
        lead_source: lead_source
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
