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
    // Parse the request body
    const data = await req.json();
    const { phoneNumber, code, fullName, lead_source, provider = 'whatsapp' } = data;
    
    if (!phoneNumber || !code) {
      throw new Error('Phone number and verification code are required');
    }
    
    console.log("Verifying customer login OTP for phone:", phoneNumber);
      
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
    
    // Ensure the phone number format is consistent (without + prefix for database queries)
    const normalizedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber.substring(1) 
      : phoneNumber;
    
    // Format with + for auth API
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+${phoneNumber}`;
    
    console.log("Normalized phone for OTP verification:", normalizedPhone);
    
    // Step 1: Verify OTP from database
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('phone_auth_codes')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('code', code)
      .single();
      
    if (otpError || !otpData) {
      console.error('Customer OTP verification error:', otpError || "No matching OTP found");
      console.log("Checking database for phone:", normalizedPhone, "code:", code);
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
      console.error('Customer OTP expired');
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
    
    // Extract fullName and lead_source from OTP data or use provided values
    const userName = fullName || otpData.full_name || '';
    const userLeadSource = lead_source || otpData.lead_source || null;
    
    // Determine communication channel preference
    const communicationChannel = provider === 'twofactor' || provider === 'sms' ? 'sms' : 'whatsapp';
    
    console.log("OTP validated for customer login user:", userName, "lead source:", userLeadSource, "communication channel:", communicationChannel);
    
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
      if (!userName) {
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
        
        // Previous approach was causing database errors, so trying a simplified approach
        // Create a unique email based on phone number and random ID
        const randomId = Array.from(crypto.getRandomValues(new Uint8Array(8)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        const email = `phone_${normalizedPhone.replace(/[^0-9]/g, '')}_${randomId}@example.com`;
        
        // Generate a random password
        const password = crypto.randomUUID();
        
        // Log details before creating user
        console.log(`Creating user with email ${email}`);
        
        // Simplified createUser call with minimal required fields
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          raw_user_meta_data: { 
            full_name: userName,
            phone: normalizedPhone,
            lead_source: userLeadSource,
            communication_consent: true,
            communication_channel: communicationChannel
          }
        });
        
        if (createError) {
          console.error('Error creating user during customer login:', createError);
          
          // Check if profile entry exists despite auth error
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('phone_number', normalizedPhone)
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
                raw_user_meta_data: {
                  ...authUser.user.raw_user_meta_data,
                  phone: normalizedPhone,
                  lead_source: userLeadSource,
                  communication_consent: true,
                  communication_channel: communicationChannel
                }
              });
              
              // Set credentials for frontend login
              credentials = {
                email: email,
                password: tempPassword
              };
              
              // Update the profile with communication preferences
              await supabaseAdmin
                .from('profiles')
                .update({
                  communication_consent: true,
                  communication_channel: communicationChannel
                })
                .eq('id', userId);
              
              // Delete used OTP
              await supabaseAdmin
                .from('phone_auth_codes')
                .delete()
                .eq('phone_number', normalizedPhone);
                
              // Return success with existing user info
              return new Response(
                JSON.stringify({
                  success: true,
                  message: 'Login successful',
                  isNewUser: false,
                  userId: userId,
                  phoneNumber: normalizedPhone,
                  credentials: credentials,
                  fullName: userName,
                  lead_source: userLeadSource,
                  communicationChannel: communicationChannel
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
          );
        }
        
        userId = newUser.user.id;
        
        console.log("User created during customer login with ID:", userId);
        
        // Create profile for the new user
        // Wait a short time for auth triggers to run
        await new Promise(resolve => setTimeout(resolve, 1000)); // Increased wait time
        
        // Check if profile already exists (created by database trigger)
        const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (existingProfile) {
          console.log('Profile already exists, updating with complete information:', userId);
          
          // Update the existing profile with all necessary fields
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              phone_number: normalizedPhone,
              phone_verified: true,
              full_name: userName,
              lead_source: userLeadSource,
              role: 'customer', // Keep the role consistent
              communication_consent: true,
              communication_channel: communicationChannel,
              last_used: new Date().toISOString()
            })
            .eq('id', userId);
            
          if (updateError) {
            console.error('Error updating complete profile information:', updateError);
          } else {
            console.log('Successfully updated profile with complete information');
          }
        } else {
          // Try to create a new profile if none exists
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
              id: userId, // Use userId for both id and user_id
              user_id: userId,
              phone_number: normalizedPhone,
              phone_verified: true,
              full_name: userName,
              lead_source: userLeadSource,
              role: 'customer',
              wallet_balance: 0,
              communication_consent: true,
              communication_channel: communicationChannel,
              last_used: new Date().toISOString()
            });
            
          if (profileError) {
            console.log('Profile insert error, trying again with update:', profileError);
            
            // If insert fails, try updating as a last resort
            const { error: updateError } = await supabaseAdmin
              .from('profiles')
              .update({
                phone_number: normalizedPhone,
                phone_verified: true,
                full_name: userName,
                lead_source: userLeadSource,
                role: 'customer',
                communication_consent: true,
                communication_channel: communicationChannel,
                last_used: new Date().toISOString()
              })
              .eq('id', userId);
              
            if (updateError) {
              console.error('All profile creation/update attempts failed:', updateError);
            }
          }
        }
        
        // Return credentials for frontend to create session
        credentials = {
          email: email,
          password: password
        };
        
        console.log("User registered successfully with credentials during customer login");
      } catch (error) {
        console.error('Unexpected error in user creation during customer login:', error);
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
      
      console.log("Existing user found during customer login with ID:", userId);
      
      // Get user from auth
      const { data: userData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (authUserError) {
        console.error('Error fetching user during customer login:', authUserError);
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
        ...userData.user.raw_user_meta_data,
        phone: normalizedPhone,
        communication_consent: true,
        communication_channel: communicationChannel
      };
      
      // Only add lead_source if it exists and is not already set
      if (userLeadSource && !userData.user.raw_user_meta_data.lead_source) {
        updatedMetadata.lead_source = userLeadSource;
      }
      
      // Update the user's password and metadata
      const { error: passwordUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { 
          password: tempPassword,
          raw_user_meta_data: updatedMetadata
        }
      );
      
      if (passwordUpdateError) {
        console.error('Error updating user password during customer login:', passwordUpdateError);
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
      const updateData: any = { 
        phone_number: normalizedPhone,
        phone_verified: true, // Added phone_verified
        full_name: userName || existingUser.full_name, // Add full_name from metadata if available
        communication_consent: true,
        communication_channel: communicationChannel,
        last_used: new Date().toISOString() // Add last_used timestamp
      };
      
      if (userLeadSource) {
        updateData.lead_source = userLeadSource;
      }
      
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', userId);
        
      if (profileUpdateError) {
        console.error('Error updating profile during customer login:', profileUpdateError);
      }
      
      // Return credentials for frontend to create session
      credentials = {
        email: email,
        password: tempPassword
      };
      
      console.log("Existing user login credentials generated during customer login");
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
        fullName: userName,
        lead_source: userLeadSource,
        communicationChannel: communicationChannel
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
    console.error('Error verifying customer login OTP:', error);
    
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
