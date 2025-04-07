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
    const { employeeData, sendWelcomeMessage = true, createAuthAccount = true } = await req.json();
    if (!employeeData || !employeeData.name || !employeeData.phone) {
      throw new Error("Employee data is required with at least name and phone number");
    }
    // Create Supabase client
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    // 1. Create the employee record
    const { data: newEmployee, error: employeeError } = await supabaseAdmin.from('employees').insert({
      name: employeeData.name,
      email: employeeData.email || (employeeData.phone + "@salon.com"),
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
    if (createAuthAccount) {
      try {
        // Generate email from phone if not provided
        const email = employeeData.email || `${employeeData.phone.replace(/\D/g, '')}@staff.internal`;
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
    // 5. Send welcome message if requested
    let welcomeMessageSent = false;
    if (sendWelcomeMessage) {
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

Your staff account has been created and your manager will provide you with the login details soon. You'll receive a verification message with instructions to activate your account.

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
    // 6. Generate and store verification token
    let verificationSent = false;
    try {
      // Get base URL from request origin or use default
      const requestUrl = new URL(req.url);
      const baseUrl = employeeData.baseUrl || `${requestUrl.protocol}//${requestUrl.host}`;
      // Invoke the verify-employee-otp function
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-employee-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          phoneNumber: employeeData.phone,
          employeeId: employeeId,
          name: employeeData.name,
          baseUrl
        })
      });
      const result = await response.json();
      if (result.success) {
        verificationSent = true;
      } else {
        console.error(`Error sending verification: ${result.message}`);
      }
    } catch (error) {
      console.error(`Error sending verification: ${error.message}`);
    // Continue with the process even if verification fails
    }
    return new Response(JSON.stringify({
      success: true,
      employee: newEmployee,
      authAccountCreated,
      welcomeMessageSent,
      verificationSent,
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
