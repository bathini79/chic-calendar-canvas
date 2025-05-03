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
    const { phoneNumber, code, provider = 'any' } = data;
    const fullName = data.fullName || null;
    const lead_source = data.lead_source || null;
    
    if (!phoneNumber || !code) {
      throw new Error('Phone number and verification code are required');
    }
    
    console.log("Verifying customer login OTP for phone:", phoneNumber, "with provider:", provider);
      
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
    
    console.log("OTP validated for customer login user:", userName, "lead source:", userLeadSource);
    
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
            error: 'missing_name',
            message: 'Full name is required for registration'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
      
      try {
        // Generate a random email/password for the new user
        // This is needed because Supabase Auth requires an email
        const tempEmail = `${crypto.randomUUID()}@placeholder.com`;
        const tempPassword = crypto.randomUUID();
        
        // Create the user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: tempEmail,
          password: tempPassword,
          email_confirm: true,
          phone: formattedPhone,
          phone_confirm: true,
          user_metadata: {
            full_name: userName,
            phone: normalizedPhone,
            lead_source: userLeadSource,
            communication_consent: true, // By completing verification, they consent to receive communication
            communication_channel: provider === 'twofactor' || provider === 'sms' ? 'sms' : 'whatsapp'
          }
        });
        
        if (authError) throw authError;
        
        userId = authData.user.id;
        credentials = { email: tempEmail, password: tempPassword };
        
        // Update the profiles table with the user data
        // The RLS triggers should handle this, but we'll do it explicitly to be sure
        await supabaseAdmin
          .from('profiles')
          .update({
            full_name: userName,
            role: 'customer',
            lead_source: userLeadSource,
            communication_consent: true,
            communication_channel: provider === 'twofactor' || provider === 'sms' ? 'sms' : 'whatsapp'
          })
          .eq('id', userId);
          
        console.log("New customer registered with ID:", userId, "via provider:", provider);
        
      } catch (error) {
        console.error('Error creating new user during OTP verification:', error);
        return new Response(
          JSON.stringify({
            error: 'registration_failed',
            message: error.message || 'Failed to register new user'
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
        console.error('Error fetching auth user during OTP verification:', authUserError);
        return new Response(
          JSON.stringify({
            error: 'auth_error',
            message: authUserError.message
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
      };
      
      // Only add lead_source if it exists and is not already set
      if (userLeadSource && !userData.user.raw_user_meta_data.lead_source) {
        updatedMetadata.lead_source = userLeadSource;
      }
      
      // Update communication preferences if specified
      if (provider && provider !== 'any') {
        updatedMetadata.communication_channel = provider === 'twofactor' || provider === 'sms' ? 'sms' : 'whatsapp';
      }
      
      // Update the user's password and metadata
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          password: tempPassword,
          user_metadata: updatedMetadata
        }
      );
      
      if (updateError) {
        console.error('Error updating user during OTP verification:', updateError);
        return new Response(
          JSON.stringify({
            error: 'update_error',
            message: updateError.message
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
      
      // Update profile table with latest communication preferences
      if (provider && provider !== 'any') {
        await supabaseAdmin
          .from('profiles')
          .update({
            communication_consent: true,
            communication_channel: provider === 'twofactor' || provider === 'sms' ? 'sms' : 'whatsapp'
          })
          .eq('id', userId);
      }
      
      credentials = { email, password: tempPassword };
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
        communicationChannel: provider === 'twofactor' || provider === 'sms' ? 'sms' : 'whatsapp'
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
