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
    
    // Step 2: Check if user exists by phone number
    let existingUserQuery = supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone_number', phoneNumber);
    
    const { data: existingUser, error: userError } = await existingUserQuery.maybeSingle();
    
    let userId = null
    let isNewUser = false
    let credentials = null
    
    // Step 3: Handle authentication based on whether user exists
    if (userError || !existingUser) {
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
        // Create a unique email based on phone number
        const email = `${phoneNumber.replace(/[^0-9]/g, '')}@phone.user`
        // Generate a random password
        const password = crypto.randomUUID()
        // Create new user with phone as unique identifier
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
          
          // Check if profile entry exists despite auth error
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('phone_number', phoneNumber)
            .maybeSingle();
            
          if (existingProfile) {
            userId = existingProfile.id;
            
            // Try to get auth user by ID to proceed with login
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
            
            if (authUser && authUser.user) {              
              // Get email from existing auth user
              const email = authUser.user.email;
              
              // Generate a temporary password for this login
              const tempPassword = crypto.randomUUID();
              
              // Update password to allow login
              await supabaseAdmin.auth.admin.updateUserById(userId, { 
                password: tempPassword,
                user_metadata: {
                  ...authUser.user.user_metadata,
                  phone: phoneNumber,  // Ensure phone is in metadata
                  lead_source: lead_source
                }
              });
              
              // Set credentials for frontend login
              credentials = {
                email: email,
                password: tempPassword
              };
              
              // Delete used OTP
              await supabaseAdmin
                .from('phone_auth_codes')
                .delete()
                .eq('phone_number', phoneNumber);
                
              // Return success with existing user info
              return new Response(
                JSON.stringify({
                  message: 'Login successful',
                  isNewUser: false,
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
              );
            }
          }
          
          // If we reach here, the error is real and we should return it
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
        
        // Explicitly create profile in case the trigger doesn't work
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            phone_verified: true,
            lead_source: lead_source || null
          })
          .eq('id', userId);
          
        if (profileError) {
          console.error('Error updating profile:', profileError)
        }
        
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
      userId = existingUser.id
      
      // Get user from auth
      const { data: userData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
      
      if (authUserError) {
        console.error('Error fetching user:', authUserError)
        return new Response(
          JSON.stringify({ 
            error: "user_not_found",
            message: "User exists in profiles but not in auth"
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }
      
      // Extract email from user data
      const email = userData.user.email
      
      // Generate a one-time password for this login
      const tempPassword = crypto.randomUUID()
      
      // Update the user's metadata with lead_source if provided
      const updatedMetadata = {
        ...userData.user.user_metadata,
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
      
      // Also update profile lead_source if provided
      if (lead_source) {
        const { error: profileUpdateError } = await supabaseAdmin
          .from('profiles')
          .update({ lead_source: lead_source })
          .eq('id', userId);
          
        if (profileUpdateError) {
          console.error('Error updating profile lead_source:', profileUpdateError);
        }
      }
      
      // Update phone_verified to true
      const { error: verificationUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ phone_verified: true })
        .eq('id', userId);
        
      if (verificationUpdateError) {
        console.error('Error updating verification status:', verificationUpdateError);
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
