import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }
  
  try {
    console.log("Employee onboarding function triggered");
    
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
      throw new Error("Employee data is required with at least name and phone number");
    }
    
    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Ensure email is never null
    const safeEmail = employeeData.email || `${employeeData.phone.replace(/\D/g, "")}@staff.internal`;

    // 1. Create the employee record with inactive status
    const { data: newEmployee, error: employeeError } = await supabaseAdmin
      .from("employees")
      .insert({
        name: employeeData.name,
        email: safeEmail,
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
        console.error(`Error adding employee locations: ${locationsError.message}`);
      }
    }
    
    // 4. Create auth account if requested
    let authAccountCreated = false;
    let authUserId = null;
    if (createAuthAccount) {
      try {
        // Generate random password
        const generatePassword = () => {
          const length = 12;
          const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
          let password = "";
          for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
          }
          return password;
        };
        
        const password = generatePassword();
        
        // Before creating a user, check if one with the same email already exists
        console.log(`Checking if user with email ${safeEmail} already exists`);
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
          filter: {
            email: safeEmail,
          },
        });
        
        let existingUser = null;
        if (existingUsers && existingUsers.users && existingUsers.users.length > 0) {
          existingUser = existingUsers.users[0];
          console.log(`Found existing user with email ${safeEmail}, id: ${existingUser.id}`);
        }
        
        if (existingUser) {
          // User already exists, update them instead of creating a new one
          console.log(`Updating existing user ${existingUser.id}`);
          const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.id,
            {
              email: safeEmail,
              password,
              phone: employeeData.phone,
              email_confirm: true,
              user_metadata: {
                full_name: employeeData.name,
                employee_id: employeeId,
                employment_type: employeeData.employment_type || "stylist",
              },
            }
          );
          
          if (updateError) throw updateError;
          
          authUserId = existingUser.id;
        } else {
          // No existing user found, create a new one
          console.log(`Creating new user with email ${safeEmail}`);
          
          // Add a unique random string to ensure email uniqueness if needed
          const uniqueEmail = safeEmail.includes('@staff.internal') 
            ? `${safeEmail.split('@')[0]}_${Date.now().toString(36)}@staff.internal` 
            : safeEmail;
            
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: uniqueEmail,
            password,
            phone: employeeData.phone,
            email_confirm: true,
            user_metadata: {
              full_name: employeeData.name,
              employee_id: employeeId,
              employment_type: employeeData.employment_type || "stylist",
            },
          });
          
          if (authError) throw authError;
          
          authUserId = authUser.user.id;
        }
        
        // Link auth user to employee record
        await supabaseAdmin
          .from("employees")
          .update({ auth_id: authUserId })
          .eq("id", employeeId);
          
        authAccountCreated = true;
      } catch (error) {
        console.error(`Error creating/updating auth account: ${error.message}`);
      }
    }

    // 5. Send verification or welcome message
    let messageSent = false;
    let verificationLink = "";
    
    if (sendVerificationLink || sendWelcomeMessage) {
      try {
        // Generate simple verification link if needed
        if (sendVerificationLink) {
          const baseUrl = employeeData.baseUrl || "https://chic-calendar-canvas.vercel.app";
          
          // Generate a token
          const generateToken = () => {
            const length = 32;
            const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let token = "";
            for (let i = 0; i < length; i++) {
              const randomIndex = Math.floor(Math.random() * charset.length);
              token += charset[randomIndex];
            }
            return token;
          };
          
          // Generate a code (6-digit number)
          const generateCode = () => {
            return Math.floor(100000 + Math.random() * 900000).toString();
          };
          
          const verificationToken = generateToken();
          const verificationCode = generateCode();
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);
          
          // Store the verification token in employee_verification_links
          await supabaseAdmin
            .from("employee_verification_links")
            .insert({
              employee_id: employeeId,
              verification_token: verificationToken,
              verification_code: verificationCode,
              expires_at: expiresAt.toISOString(),
              used: false,
            });
          
          // Also store the code in phone_auth_codes for compatibility with verify-whatsapp-otp
          // Make sure to strip the + sign from the phone number as that's what verify-whatsapp-otp expects
          const normalizedPhone = employeeData.phone.startsWith('+') ? employeeData.phone.substring(1) : employeeData.phone;
          
          await supabaseAdmin
            .from("phone_auth_codes")
            .insert({
              phone_number: normalizedPhone, // Store without + prefix
              code: verificationCode,
              expires_at: expiresAt.toISOString(),
              full_name: employeeData.name,
              lead_source: "employee_onboarding"
            });
            
          // Include code, token and phone in the verification link
          verificationLink = `${baseUrl}/verify?token=${verificationToken}&code=${verificationCode}&phone=${encodeURIComponent(employeeData.phone)}`;
          console.log(`Generated verification link: ${verificationLink}`);
        }
        
        // *** SIMPLIFIED APPROACH: Just send "Hello World" via Meta WhatsApp API ***
        const { data: metaConfig } = await supabaseAdmin
          .from('messaging_providers')
          .select('configuration')
          .eq('provider_name', 'meta_whatsapp')
          .single();
          
        if (!metaConfig) {
          throw new Error('Meta WhatsApp configuration not found');
        }
        
        const config = metaConfig.configuration;
        
        if (!config.access_token || !config.phone_number_id) {
          throw new Error('Meta WhatsApp configuration is incomplete');
        }
        
        // Format the phone number
        const formattedPhone = employeeData.phone.startsWith('+') 
          ? employeeData.phone.substring(1) 
          : employeeData.phone;
          
        console.log(`Sending WhatsApp message to: ${formattedPhone}`);
        
        // Construct message - with clear verification link and formatting
        let messageText;
        
        if (verificationLink) {
          // Create a properly formatted message with line breaks to clearly show the verification link
          messageText = `Hello ${employeeData.name},

Welcome to our team! Please click the link below to verify your account:

${verificationLink}

This link will expire in 24 hours. If you have any questions, please contact your manager.

Best regards,
The Management Team`;
        } else {
          messageText = `Hello ${employeeData.name},

Welcome to our team! We're excited to have you join us.

Your staff account has been created and your manager will provide you with the login details soon.

Best regards,
The Management Team`;
        }
        
        // Log the actual message being sent for debugging
        console.log(`Message being sent:`);
        console.log(messageText);
        
        // Send the message via Meta WhatsApp API
        const apiVersion = config.api_version || 'v18.0';
        const apiUrl = `https://graph.facebook.com/${apiVersion}/${config.phone_number_id}/messages`;
        
        console.log(`Sending WhatsApp request to: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.access_token}`
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "text",
            text: { 
              preview_url: true, // Set to true to enable link previews
              body: messageText
            }
          })
        });
        
        const responseData = await response.json();
        console.log("Meta WhatsApp API response:", responseData);
        
        if (!response.ok) {
          console.error("Meta WhatsApp API error:", responseData);
          throw new Error(`Meta WhatsApp API error: ${JSON.stringify(responseData)}`);
        }
        
        // Log the message ID from the response
        const messageId = responseData.messages?.[0]?.id;
        console.log(`Message sent successfully with ID: ${messageId}`);
        
        // Record the sent message in the database for tracking
        try {
          await supabaseAdmin.from('whatsapp_messages').insert({
            provider: 'meta_whatsapp',
            direction: 'outbound',
            from_number: config.phone_number_id,
            to_number: formattedPhone,
            message_content: messageText,
            message_type: 'text',
            message_id: messageId,
            status: 'sent',
            status_timestamp: new Date().toISOString(),
            raw_payload: responseData
          });
          console.log("Message logged to database successfully");
        } catch (dbError) {
          console.error("Failed to log message to database:", dbError);
        }
        
        messageSent = true;
      } catch (error) {
        console.error(`Error sending message: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        employee: newEmployee,
        authAccountCreated,
        authUserId,
        messageSent,
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
