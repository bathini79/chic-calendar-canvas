
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.26.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  
  try {
    const { phoneNumber, code, fullName, lead_source } = await req.json();
    
    if (!phoneNumber) {
      return new Response(JSON.stringify({
        error: "Missing phoneNumber parameter"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    if (!code || code.length !== 6) {
      return new Response(JSON.stringify({
        error: "Invalid verification code"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    // Normalize the phone number - strip "+" prefix for consistent storage/lookup
    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;
    
    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    console.log(`Verifying code for phone ${normalizedPhone}`);
    
    // Find the verification code
    const { data: verificationData, error: verificationError } = await supabaseAdmin
      .from('phone_auth_codes')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (verificationError || !verificationData) {
      console.error("Error finding verification code:", verificationError);
      return new Response(JSON.stringify({
        error: "verification_not_found",
        message: "No verification code found for this phone number"
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    // Check if code is expired
    const currentTime = new Date();
    const expiresAt = new Date(verificationData.expires_at);
    
    if (currentTime > expiresAt) {
      return new Response(JSON.stringify({
        error: "code_expired",
        message: "Verification code has expired. Please request a new one."
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    // Check if the code matches
    if (verificationData.code !== code) {
      return new Response(JSON.stringify({
        error: "invalid_code",
        message: "Invalid verification code"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    // Check if user already exists with this phone number
    // Format the phone for search - different formats can cause issues
    const searchPhone = normalizedPhone;
    
    // Look for existing user with this phone
    const { data: existingProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('phone_number', searchPhone)
      .maybeSingle();
    
    if (profilesError) {
      console.error("Error checking for existing profile:", profilesError);
    }
    
    // If this is a new user and no full name provided, request it
    if (!existingProfiles && !fullName) {
      console.log("New user requires a name");
      return new Response(JSON.stringify({
        error: "new_user_requires_name",
        message: "Please provide your full name to complete registration"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    // Get stored full name from verification if available
    const storedFullName = verificationData.full_name || '';
    const finalFullName = fullName || storedFullName || `User_${searchPhone.substring(searchPhone.length - 4)}`;
    const userLead = lead_source || verificationData.lead_source || 'direct';
    
    // Create unique email from phone number
    const emailFromPhone = `${searchPhone}@phone-auth.user`;
    
    // Generate random password (user will authenticate via OTP)
    const generatePassword = () => {
      const length = 16;
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
      let password = '';
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
      }
      return password;
    };
    
    let userId = null;
    let userEmail = null;
    
    // If user doesn't exist, create new auth user and profile
    if (!existingProfiles) {
      console.log("Creating new user");
      try {
        // First create the auth user
        const password = generatePassword();
        
        // Create user record in auth.users
        try {
          const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: emailFromPhone,
            password: password,
            phone: phoneNumber, // Include with country code
            email_confirm: true,
            user_metadata: {
              full_name: finalFullName,
              phone: phoneNumber
            }
          });
          
          if (userError) {
            console.error("Auth user creation error:", userError);
            throw new Error(`Auth error: ${userError.message}`);
          }
          
          userId = newUser.user.id;
          userEmail = newUser.user.email;
          
          // The profile should be created by the database trigger
          // But we'll update it with additional info
          
          console.log("Created auth user:", userId);
          
          // Ensure profile exists with proper data
          const { error: profileUpdateError } = await supabaseAdmin
            .from('profiles')
            .update({
              full_name: finalFullName,
              phone_number: searchPhone,
              lead_source: userLead,
              phone_verified: true
            })
            .eq('id', userId);
          
          if (profileUpdateError) {
            console.error("Error updating profile:", profileUpdateError);
            throw new Error(`Profile update error: ${profileUpdateError.message}`);
          }
          
        } catch (createError) {
          console.error("Error in user creation process:", createError);
          return new Response(JSON.stringify({
            error: "user_creation_failed",
            message: "User creation failed",
            details: createError.message
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }
      } catch (e) {
        console.error("User creation failed:", e);
        return new Response(JSON.stringify({
          error: "user_creation_failed",
          message: "User creation failed",
          details: e.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
    } else {
      // User exists, use their info
      userId = existingProfiles.id;
      userEmail = existingProfiles.email || emailFromPhone;
      
      // Update their full name if provided and different
      if (fullName && fullName !== existingProfiles.full_name) {
        await supabaseAdmin
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', userId);
      }
    }
    
    console.log("Verification successful for user:", userId);
    
    // Delete the used verification code
    await supabaseAdmin
      .from('phone_auth_codes')
      .delete()
      .eq('phone_number', normalizedPhone);
    
    // Prepare login credentials to return
    return new Response(JSON.stringify({
      success: true,
      isNewUser: !existingProfiles,
      fullName: finalFullName,
      userId: userId,
      credentials: {
        email: userEmail,
        password: generatePassword() // Generate a temporary password for this session login
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
    
  } catch (error) {
    console.error("Error in verification process:", error);
    
    return new Response(JSON.stringify({
      error: error.message || "Unknown error occurred"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
