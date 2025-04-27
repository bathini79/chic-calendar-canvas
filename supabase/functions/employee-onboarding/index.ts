import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";
// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper functions for direct WhatsApp message sending
async function sendMetaWhatsAppMessage(
  phoneNumber: string,
  message: string,
  configuration: any,
  supabaseClient: any
) {
  if (!configuration?.accessToken || !configuration?.phoneNumberId) {
    throw new Error('Meta WhatsApp configuration is incomplete');
  }

  const { accessToken, phoneNumberId } = configuration;
  const apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  
  // Format the phone number according to WhatsApp requirements
  const formattedPhone = phoneNumber.startsWith('+') 
    ? phoneNumber.substring(1) 
    : phoneNumber;
  
  // Construct the payload for Meta WhatsApp API
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: formattedPhone,
    type: "text",
    text: { 
      preview_url: false,
      body: message
    }
  };

  // Send the message to Meta WhatsApp API
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  const responseData = await response.json();
  
  if (!response.ok) {
    console.error('Meta WhatsApp API error:', responseData);
    throw new Error(`Meta WhatsApp API error: ${JSON.stringify(responseData)}`);
  }

  // Store the message in the database
  const messageId = responseData.messages?.[0]?.id;
  
  await supabaseClient.from('whatsapp_messages').insert({
    provider: 'meta_whatsapp',
    direction: 'outbound',
    from_number: phoneNumberId,
    to_number: formattedPhone,
    message_content: message,
    message_type: 'text',
    message_id: messageId,
    status: 'sent',
    status_timestamp: new Date().toISOString(),
    raw_payload: responseData
  });

  return {
    success: true,
    provider: 'meta_whatsapp',
    messageId,
    response: responseData
  };
}

async function sendGupshupMessage(
  phoneNumber: string,
  message: string, 
  configuration: any,
  supabaseClient: any
) {
  if (!configuration?.apiKey || !configuration?.sourcePhoneNumber) {
    throw new Error('Gupshup configuration is incomplete');
  }

  const { apiKey, sourcePhoneNumber } = configuration;
  const apiUrl = 'https://api.gupshup.io/sm/api/v1/msg';
  
  // Format the phone number according to Gupshup requirements
  const formattedPhone = phoneNumber.startsWith('+') 
    ? phoneNumber.substring(1) 
    : phoneNumber;
  
  // Prepare form data for Gupshup API
  const formData = new URLSearchParams();
  formData.append('channel', 'whatsapp');
  formData.append('source', sourcePhoneNumber);
  formData.append('destination', formattedPhone);
  formData.append('message', JSON.stringify({
    type: 'text',
    text: message
  }));
  formData.append('src.name', 'ChicCalendarCanvas');

  // Send the message to Gupshup API
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'apikey': apiKey
    },
    body: formData.toString()
  });

  const responseData = await response.json();
  
  if (!response.ok || responseData.status !== 'submitted') {
    console.error('Gupshup API error:', responseData);
    throw new Error(`Gupshup API error: ${JSON.stringify(responseData)}`);
  }

  // Store the message in the database
  const messageId = responseData.messageId;
  
  await supabaseClient.from('whatsapp_messages').insert({
    provider: 'gupshup',
    direction: 'outbound',
    from_number: sourcePhoneNumber,
    to_number: formattedPhone,
    message_content: message,
    message_type: 'text',
    message_id: messageId,
    status: 'sent',
    status_timestamp: new Date().toISOString(),
    raw_payload: responseData
  });

  return {
    success: true,
    provider: 'gupshup',
    messageId,
    response: responseData
  };
}

// Function to send WhatsApp message directly
async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
  notificationType: string,
  preferredProvider: string | null,
  supabaseAdmin: any
) {
  try {
    console.log(`Sending WhatsApp message to ${phoneNumber}`);
    
    // Get active messaging providers
    const { data: providers, error: providersError } = await supabaseAdmin
      .from('messaging_providers')
      .select('provider_name, is_active, configuration');
    
    if (providersError) {
      throw new Error(`Failed to fetch messaging providers: ${providersError.message}`);
    }
    
    // Filter to only get active providers
    const activeProviders = providers.filter(p => p.is_active === true);
    
    if (activeProviders.length === 0) {
      throw new Error('No active WhatsApp messaging providers available');
    }
    
    // Find the active providers we support
    const metaProvider = activeProviders.find(p => p.provider_name === 'meta_whatsapp');
    const gupshupProvider = activeProviders.find(p => p.provider_name === 'gupshup');
    
    // Determine which provider to use
    let providerName;
    let selectedProvider;
    
    if (preferredProvider) {
      // If a preferred provider is specified, try to use it if it's active
      selectedProvider = activeProviders.find(p => p.provider_name === preferredProvider);
      
      if (selectedProvider) {
        // Use the preferred provider if it's active
        providerName = preferredProvider;
      } else {
        // If preferred provider isn't active, use any available provider as fallback
        if (preferredProvider === 'meta_whatsapp' && gupshupProvider) {
          providerName = 'gupshup';
          selectedProvider = gupshupProvider;
        } else if (preferredProvider === 'gupshup' && metaProvider) {
          providerName = 'meta_whatsapp';
          selectedProvider = metaProvider;
        } else {
          throw new Error(`Preferred provider ${preferredProvider} is not active and no fallback is available`);
        }
      }
    } else {
      // Auto-select based on availability, prioritizing Meta WhatsApp
      if (metaProvider) {
        providerName = 'meta_whatsapp';
        selectedProvider = metaProvider;
      } else if (gupshupProvider) {
        providerName = 'gupshup';
        selectedProvider = gupshupProvider;
      } else {
        throw new Error('No supported WhatsApp messaging provider is active');
      }
    }
    
    if (!selectedProvider) {
      throw new Error(`No active provider found for ${providerName}`);
    }

    // Send the message using the appropriate provider
    let result;
    if (providerName === 'meta_whatsapp') {
      result = await sendMetaWhatsAppMessage(phoneNumber, message, selectedProvider.configuration, supabaseAdmin);
    } else if (providerName === 'gupshup') {
      result = await sendGupshupMessage(phoneNumber, message, selectedProvider.configuration, supabaseAdmin);
    } else {
      throw new Error(`Unsupported provider: ${providerName}`);
    }

    console.log(`WhatsApp message sent successfully via ${providerName}`, result);
    return {
      success: true,
      provider: providerName,
      result
    };
  } catch (error) {
    console.error(`Error sending WhatsApp message: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }
  try {
    const requestBody = await req.json();
    // Check if this is a delete request
    if (requestBody.action === "delete" && requestBody.authUserId) {
      return handleDeleteAuthUser(requestBody.authUserId);
    }
    const {
      employeeData,
      sendWelcomeMessage = true,
      createAuthAccount = true,
      sendVerificationLink = true,
    } = requestBody;
    if (!employeeData || !employeeData.name || !employeeData.phone) {
      throw new Error(
        "Employee data is required with at least name and phone number"
      );
    }
    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Ensure email is never null
    const safeEmail =
      employeeData.email ||
      `${employeeData.phone.replace(/\D/g, "")}@staff.internal`;

    // 1. Create the employee record with inactive status
    const { data: newEmployee, error: employeeError } = await supabaseAdmin
      .from("employees")
      .insert({
        name: employeeData.name,
        email: safeEmail, // Use the safe email that's never null
        phone: employeeData.phone,
        photo_url: employeeData.photo_url || null,
        status: "inactive",
        employment_type: employeeData.employment_type || "stylist",
      })
      .select()
      .single();

    if (employeeError) {
      throw new Error(`Failed to create employee: ${employeeError.message}`);
    }

    const employeeId = newEmployee.id;

    // 2. Associate skills if provided
    if (employeeData.skills && employeeData.skills.length > 0) {
      const skillsToInsert = employeeData.skills.map((skillId) => ({
        employee_id: employeeId,
        service_id: skillId,
      }));
      const { error: skillsError } = await supabaseAdmin
        .from("employee_skills")
        .insert(skillsToInsert);
      if (skillsError) {
        console.error(`Error adding employee skills: ${skillsError.message}`);
        // Continue with the process even if skills insertion fails
      }
    }
    // 3. Associate locations if provided
    if (employeeData.locations && employeeData.locations.length > 0) {
      const locationsToInsert = employeeData.locations.map((locationId) => ({
        employee_id: employeeId,
        location_id: locationId,
      }));
      const { error: locationsError } = await supabaseAdmin
        .from("employee_locations")
        .insert(locationsToInsert);
      if (locationsError) {
        console.error(
          `Error adding employee locations: ${locationsError.message}`
        );
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
        const generatePassword = () => {
          const length = 12;
          const charset =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
          let password = "";
          for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
          }
          return password;
        };
        const password = generatePassword();
        // Create user in auth system
        const { data: authUser, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            phone: employeeData.phone,
            email_confirm: true,
            raw_user_meta_data: {
              full_name: employeeData.name,
              employee_id: employeeId,
              employment_type: employeeData.employment_type || "stylist",
            },
          });
        if (authError) throw authError;
        authUserId = authUser.user.id;
        // Link auth user to employee record by updating the auth_id field
        await supabaseAdmin
          .from("employees")
          .update({
            auth_id: authUser.user.id,
          })
          .eq("id", employeeId);
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
        const baseUrl =
          employeeData.baseUrl || `${Deno.env.get("SUPABASE_URL")}`;
        // Generate a random verification token
        const generateToken = () => {
          const length = 32;
          const charset =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
          let token = "";
          for (let i = 0; i < length; i++) {
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
        const { error: tokenError } = await supabaseAdmin
          .from("employee_verification_links")
          .insert({
            employee_id: employeeId,
            verification_token: verificationToken,
            expires_at: expiresAt.toISOString(),
            used: false,
          });
        if (tokenError) throw tokenError;
        // Create the verification link
        verificationLink = `${baseUrl}/verify?token=${verificationToken}&phone=${encodeURIComponent(
          employeeData.phone
        )}`;

        // Create verification message
        const message = `Hello ${employeeData.name},Welcome to our team! Please click the link below to verify your account:${verificationLink} This link will expire in 24 hours. If you have any questions, please contact your manager.Best regards,The Management Team`.trim();

        // Send the verification message via WhatsApp directly
        if (sendWelcomeMessage) {
          try {
            // Fetch the system preference for WhatsApp provider
            const { data: systemSettings } = await supabaseAdmin
              .from("system_settings")
              .select("value")
              .eq("key", "preferred_whatsapp_provider")
              .single();

            const preferredProvider = systemSettings?.value || null;
            
            // Send WhatsApp message directly
            const whatsappResult = await sendWhatsAppMessage(
              employeeData.phone,
              message,
              "verification_link",
              preferredProvider,
              supabaseAdmin
            );

            if (whatsappResult.success) {
              verificationSent = true;
              console.log(
                "Verification message sent successfully",
                whatsappResult
              );
            } else {
              throw new Error(
                `Failed to send verification message: ${whatsappResult.error}`
              );
            }
          } catch (whatsappError) {
            console.error(
              `Error sending verification message: ${whatsappError.message}`
            );
            // Continue with the process even if sending the message fails
          }
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
        // Create welcome message
        const message = `
Hello ${employeeData.name},

Welcome to our team! We're excited to have you join us.

Your staff account has been created and your manager will provide you with the login details soon.

If you have any questions, please contact your manager.

Best regards,
The Management Team
`.trim();

        // Fetch the system preference for WhatsApp provider
        const { data: systemSettings } = await supabaseAdmin
          .from("system_settings")
          .select("value")
          .eq("key", "preferred_whatsapp_provider")
          .single();

        const preferredProvider = systemSettings?.value || null;

        // Send WhatsApp message directly
        console.log(`Sending welcome message to ${employeeData.phone}`);
        
        const whatsappResult = await sendWhatsAppMessage(
          employeeData.phone,
          message,
          "welcome_message",
          preferredProvider,
          supabaseAdmin
        );

        if (whatsappResult.success) {
          console.log(
            `WhatsApp welcome message result: ${JSON.stringify(whatsappResult)}`
          );
          welcomeMessageSent = true;
        } else {
          throw new Error(
            `Failed to send welcome message: ${whatsappResult.error}`
          );
        }
      } catch (error) {
        console.error(`Error sending welcome message: ${error.message}`);
        // Continue with the process even if welcome message fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        employee: newEmployee,
        authAccountCreated,
        authUserId,
        welcomeMessageSent,
        verificationSent,
        verificationLink,
        message: "Employee onboarding process completed",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in employee onboarding:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Failed to complete employee onboarding",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

// Helper function to handle auth user deletion
async function handleDeleteAuthUser(authUserId) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );
    // Delete the auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
    if (error) throw error;
    return new Response(
      JSON.stringify({
        success: true,
        message: "Auth user deleted successfully",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error deleting auth user:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Failed to delete auth user",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
}
