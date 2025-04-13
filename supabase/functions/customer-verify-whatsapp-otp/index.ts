import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.26.0';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract payload from request
    const { phoneNumber, code, fullName, lead_source } = await req.json();
    
    if (!phoneNumber || !code) {
      throw new Error('Phone number and verification code are required');
    }
      
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase credentials not configured');
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });    
    
    console.log("Verifying code for phone:", phoneNumber);
    
    // Ensure the phone number format is consistent (without + prefix)
    const normalizedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber.substring(1) 
      : phoneNumber;
    
    // Step 1: Verify OTP from database
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('phone_auth_codes')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('code', code)
      .single();
      
    if (otpError || !otpData) {
      console.error('OTP verification error:', otpError || "No matching OTP found");
      return new Response(
        JSON.stringify({ 
          error: 'invalid_code',
          message: 'Invalid verification code'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Using 200 to avoid non-2xx handling issues
        }
      );
    }
    
    // Check if OTP has expired
    const expiresAt = new Date(otpData.expires_at);
    const currentTime = new Date();
    
    if (currentTime > expiresAt) {
      console.error('OTP expired');
      return new Response(
        JSON.stringify({ 
          error: 'code_expired',
          message: 'Verification code has expired'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    // Extract fullName from OTP data if not provided in request
    const userFullName = fullName || otpData.full_name || '';
    const userLeadSource = lead_source || otpData.lead_source || null;
    
    // Step 2: Check if user exists by phone number
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();
    
    let userId = null;
    let isNewUser = false;
    let credentials = null;
    
    // Step 3: Handle authentication based on whether user exists
    if (userError || !existingUser) {
      // New user registration
      isNewUser = true;
      
      // New user requires fullName
      if (!userFullName) {
        return new Response(
          JSON.stringify({ 
            error: "new_user_requires_name",
            message: "New user registration requires a full name"
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
      
      try {
        console.log("Creating new user with phone:", normalizedPhone);
        
        // Create a unique email based on phone number
        const email = `${normalizedPhone.replace(/[^0-9]/g, '')}@phone.user`;
        // Generate a random password
        const password = crypto.randomUUID();
        // Create new user with phone as unique identifier
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          phone: `+${normalizedPhone}`, // Add + for auth storage
          email: email,
          password: password,
          phone_confirm: true,
          email_confirm: true,
          user_metadata: { 
            full_name: userFullName,
            phone_verified: true,
            phone: `${normalizedPhone}`, // Add + for metadata
            lead_source: userLeadSource
          }
        });
        
        if (createError) {
          console.error('Error creating user:', createError);
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
          );
        }
        
        userId = newUser.user.id;
        
        console.log("User created with ID:", userId);
        
        // Explicitly create profile in case the trigger doesn't work
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            phone_number: normalizedPhone,
            phone_verified: true,
            full_name: userFullName,
            lead_source: userLeadSource,
            role: 'customer'
          });
          
        if (profileError) {
          console.error('Error creating profile:', profileError);
          
          // Try to update if insert failed due to existing record
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              phone_number: normalizedPhone,
              phone_verified: true,
              full_name: userFullName,
              lead_source: userLeadSource
            })
            .eq('id', userId);
            
          if (updateError) {
            console.error('Error updating profile:', updateError);
          }
        }
        
        // Return credentials for frontend to create session
        credentials = {
          email: email,
          password: password
        };
        
        console.log("User registered successfully with credentials");
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
        );
      }
    } else {
      // Existing user - direct sign in
      userId = existingUser.id;
      
      console.log("Existing user found with ID:", userId);
      
      // Get user from auth
      const { data: userData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (authUserError) {
        console.error('Error fetching user:', authUserError);
        return new Response(
          JSON.stringify({ 
            error: "user_not_found",
            message: "User exists in profiles but not in auth"
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
      
      // Extract email from user data
      const email = userData.user.email;
      
      // Generate a one-time password for this login
      const tempPassword = crypto.randomUUID();
      
      // Update the user's metadata with lead_source if provided
      const updatedMetadata = {
        ...userData.user.user_metadata,
        phone: `${normalizedPhone}`, // Add + for metadata
      };
      
      // Only add lead_source if it exists and is not already set
      if (userLeadSource && !userData.user.user_metadata.lead_source) {
        updatedMetadata.lead_source = userLeadSource;
      }
      
      // Update the user's password and metadata
      const { error: passwordUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { 
          password: tempPassword,
          user_metadata: updatedMetadata
        }
      );
      
      if (passwordUpdateError) {
        console.error('Error updating user password:', passwordUpdateError);
        return new Response(
          JSON.stringify({ 
            error: "password_update_failed",
            message: "Failed to update user credentials"
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
      
      // Also update profile phone number and lead_source if provided
      const updateData: any = { phone_number: normalizedPhone };
      if (userLeadSource) {
        updateData.lead_source = userLeadSource;
      }
      
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', userId);
        
      if (profileUpdateError) {
        console.error('Error updating profile:', profileUpdateError);
      }
      
      // Return credentials for frontend to create session
      credentials = {
        email: email,
        password: tempPassword
      };
      
      console.log("Existing user login credentials generated");
    }
    
    // Delete used OTP
    await supabaseAdmin
      .from('phone_auth_codes')
      .delete()
      .eq('phone_number', normalizedPhone);
    
    // Return user data and credentials
    return new Response(
      JSON.stringify({ 
        success: true,
        message: isNewUser ? 'Registration successful' : 'Login successful',
        isNewUser: isNewUser,
        userId: userId,
        phoneNumber: normalizedPhone,
        credentials: credentials,
        fullName: userFullName,
        lead_source: userLeadSource
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error verifying OTP:', error);
    
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
    );
  }
});
