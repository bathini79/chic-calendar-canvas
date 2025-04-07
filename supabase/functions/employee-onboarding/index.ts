import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";
// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const requestBody = await req.json();
    // Check if this is a delete request
    if (requestBody.action === 'delete' && requestBody.authUserId) {
      return handleDeleteAuthUser(requestBody.authUserId);
    }
    const { employeeData, sendWelcomeMessage = true, createAuthAccount = true, sendVerificationLink = true } = requestBody;
    if (!employeeData || !employeeData.name || !employeeData.phone) {
      throw new Error("Employee data is required with at least name and phone number");
    }
    // Create Supabase client
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    
    // Ensure email is never null
    const safeEmail = employeeData.email || `${employeeData.phone.replace(/\D/g, '')}@staff.internal`;
    
    // 1. Create the employee record with inactive status
    const { data: newEmployee, error: employeeError } = await supabaseAdmin.from('employees').insert({
      name: employeeData.name,
      email: safeEmail, // Use the safe email that's never null
      phone: employeeData.phone,
      photo_url: employeeData.photo_url || null,
      status: 'inactive',
      employment_type: employeeData.employment_type || 'stylist'
    }).select().single();
    
    if (employeeError) {
      throw new Error(`Failed to create employee: ${employeeError.message}`);
    }
    
    const employeeId = newEmployee.id;
    
    // 2. Associate skills if provided
    if (employeeData.skills && employeeData.skills.length > 0) {
      const skillsToInsert = employeeData.skills.map((skillId)=>({
          employee_id: employeeId,
          service_id: skillId
        }));
      const { error: skillsError } = await supabaseAdmin.from('employee_skills').insert(skillsToInsert);
      if (skillsError) {
        console.error(`Error adding employee skills: ${skillsError.message}`);
      // Continue with the process even if skills insertion fails
      }
    }
    // 3. Associate locations if provided
    if (employeeData.locations && employeeData.locations.length > 0) {
      const locationsToInsert = employeeData.locations.map((locationId)=>({
          employee_id: employeeId,
          location_id: locationId
        }));
      const { error: locationsError } = await supabaseAdmin.from('employee_locations').insert(locationsToInsert);
      if (locationsError) {
        console.error(`Error adding employee locations: ${locationsError.message}`);
      // Continue with the process even if locations insertion fails
      }
    }
    // 4. Create auth account if requested
    let authAccountCreated = false;
    let authUserId = null;
    if (createAuthAccount) {
      try {
        // Use the same safe email
        const email = safeEmail;
        
        // Generate random password
        const generatePassword = ()=>{
          const length = 12;
          const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
          let password = "";
          for(let i = 0; i < length; i++){
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
          }
          return password;
        };
        const password = generatePassword();
        // Create user in auth system
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          phone: employeeData.phone,
          email_confirm: true,
          user_metadata: {
            full_name: employeeData.name,
            employee_id: employeeId,
            employment_type: employeeData.employment_type || 'stylist'
          }
        });
        if (authError) throw authError;
        authUserId = authUser.user.id;
        // Link auth user to employee record
        await supabaseAdmin.from('employees').update({
          auth_id: authUser.user.id
        }).eq('id', employeeId);
        authAccountCreated = true;
      } catch (error) {
        console.error(`Error creating auth account: ${error.message}`);
      // Continue with the process even if auth account creation fails
      }
    }
    
    // 5. Generate and send verification link if requested
    let verificationSent = false;
    let verificationLink = "";
    if (sendVerificationLink) {
      try {
        // Get base URL from request origin or use default
        const baseUrl = employeeData.baseUrl || `${Deno.env.get('SUPABASE_URL')}`;
        // Generate a random verification token
        const generateToken = ()=>{
          const length = 32;
          const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
          let token = "";
          for(let i = 0; i < length; i++){
            const randomIndex = Math.floor(Math.random() * charset.length);
            token += charset[randomIndex];
          }
          return token;
        };
        const verificationToken = generateToken();
        // Calculate expiration (24 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        // Store the verification token in the database
        const { error: tokenError } = await supabaseAdmin.from('employee_verification_links').insert({
          employee_id: employeeId,
          verification_token: verificationToken,
          expires_at: expiresAt.toISOString(),
          used: false
        });
        if (tokenError) throw tokenError;
        // Create the verification link
        verificationLink = `${baseUrl}/verify?token=${verificationToken}&phone=${encodeURIComponent(employeeData.phone)}`;
        // Send the verification link via Gupshup
        try {
          // Check if Gupshup is configured
          const { data: providerConfigData, error: providerConfigError } = await supabaseAdmin.from('messaging_providers').select('configuration').eq('provider_name', 'gupshup').single();
          if (providerConfigError || !providerConfigData?.configuration) {
            throw new Error('Gupshup config not found');
          }
          const gupshupConfig = providerConfigData.configuration;
          const GUPSHUP_API_KEY = gupshupConfig.api_key;
          const SOURCE_NUMBER = gupshupConfig.source_mobile.startsWith("+") ? gupshupConfig.source_mobile.slice(1) : gupshupConfig.source_mobile;
          const APP_NAME = gupshupConfig.app_name;
          // Format phone number for WhatsApp
          const formattedPhone = employeeData.phone.startsWith('+') ? employeeData.phone.slice(1) : employeeData.phone;
          // Create verification message
          const message = `
Hello ${employeeData.name},

Welcome to our team! Please click the link below to verify your account:

${verificationLink}

This link will expire in 24 hours. If you have any questions, please contact your manager.

Best regards,
The Management Team
          `.trim();
          // Send message via Gupshup
          const gupshupPayload = new URLSearchParams({
            channel: "whatsapp",
            source: SOURCE_NUMBER,
            destination: formattedPhone,
            message: JSON.stringify({
              type: "text",
              text: message
            }),
            "src.name": APP_NAME
          });
          const gupshupResponse = await fetch("https://api.gupshup.io/wa/api/v1/msg", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              apikey: GUPSHUP_API_KEY
            },
            body: gupshupPayload.toString()
          });
          const gupshupResult = await gupshupResponse.json();
          if (!gupshupResponse.ok) {
            throw new Error(`Gupshup error: ${JSON.stringify(gupshupResult)}`);
          }
          verificationSent = true;
        } catch (error) {
          console.error(`Error sending verification message: ${error.message}`);
        // Continue with the process even if sending the verification message fails
        }
      } catch (error) {
        console.error(`Error creating verification link: ${error.message}`);
      // Continue with the process even if verification link creation fails
      }
    }
    // 6. Send welcome message if requested and verification link wasn't sent
    let welcomeMessageSent = false;
    if (sendWelcomeMessage && !verificationSent) {
      try {
        // Check if Gupshup is configured
        const { data: providerConfigData, error: providerConfigError } = await supabaseAdmin.from('messaging_providers').select('configuration').eq('provider_name', 'gupshup').single();
        if (providerConfigError || !providerConfigData?.configuration) {
          throw new Error('Gupshup config not found');
        }
        const gupshupConfig = providerConfigData.configuration;
        const GUPSHUP_API_KEY = gupshupConfig.api_key;
        const SOURCE_NUMBER = gupshupConfig.source_mobile.startsWith("+") ? gupshupConfig.source_mobile.slice(1) : gupshupConfig.source_mobile;
        const APP_NAME = gupshupConfig.app_name;
        // Format phone number for WhatsApp
        const formattedPhone = employeeData.phone.startsWith('+') ? employeeData.phone.slice(1) : employeeData.phone;
        // Create welcome message
        const message = `
Hello ${employeeData.name},

Welcome to our team! We're excited to have you join us.

Your staff account has been created and your manager will provide you with the login details soon.

If you have any questions, please contact your manager.

Best regards,
The Management Team
        `.trim();
        // Send message via Gupshup
        const gupshupPayload = new URLSearchParams({
          channel: "whatsapp",
          source: SOURCE_NUMBER,
          destination: formattedPhone,
          message: JSON.stringify({
            type: "text",
            text: message
          }),
          "src.name": APP_NAME
        });
        const gupshupResponse = await fetch("https://api.gupshup.io/wa/api/v1/msg", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            apikey: GUPSHUP_API_KEY
          },
          body: gupshupPayload.toString()
        });
        const gupshupResult = await gupshupResponse.json();
        if (!gupshupResponse.ok) {
          throw new Error(`Gupshup error: ${JSON.stringify(gupshupResult)}`);
        }
        welcomeMessageSent = true;
      } catch (error) {
        console.error(`Error sending welcome message: ${error.message}`);
      // Continue with the process even if welcome message fails
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      employee: newEmployee,
      authAccountCreated,
      authUserId,
      welcomeMessageSent,
      verificationSent,
      verificationLink,
      message: "Employee onboarding process completed"
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error("Error in employee onboarding:", error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "Failed to complete employee onboarding"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
// Helper function to handle auth user deletion
async function handleDeleteAuthUser(authUserId) {
  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    // Delete the auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
    if (error) throw error;
    return new Response(JSON.stringify({
      success: true,
      message: "Auth user deleted successfully"
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error("Error deleting auth user:", error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "Failed to delete auth user"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}
