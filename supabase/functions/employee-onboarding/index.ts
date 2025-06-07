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
      sendOtp = false,  // New parameter for 2Factor OTP verification
      templateName = null  // Template name for 2Factor
    } = requestBody;
    
    if (!employeeData || !employeeData.name || !employeeData.phone) {
      throw new Error("Employee data is required with at least name and phone number");
    }
    
    // Create Supabase client with admin rights only, ignoring any auth context from request
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Normalize phone number - remove + if present
    const normalizedPhone = employeeData.phone.startsWith('+') 
      ? employeeData.phone.substring(1) 
      : employeeData.phone;
    
    // Create a default email if none was provided
    const employeeEmail = employeeData.email || `staff_${normalizedPhone}@staff.internal`;

    // Check if we're updating an existing employee or creating a new one
    let employeeId, newEmployee;
    if (employeeData.id) {
      // Update existing employee
      const { data: updatedEmployee, error: updateError } = await supabaseAdmin
        .from("employees")
        .update({
          name: employeeData.name,
          email: employeeEmail, // Always use a valid email
          phone: normalizedPhone, // Store normalized phone without +
          photo_url: employeeData.photo_url || null,
          status: employeeData.status || "inactive",
          employment_type_id: employeeData.employment_type_id
        })
        .eq("id", employeeData.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update employee: ${updateError.message}`);
      }

      employeeId = employeeData.id;
      newEmployee = updatedEmployee;
    } else {
      // Create new employee
      const { data: createdEmployee, error: employeeError } = await supabaseAdmin
        .from("employees")
        .insert({
          name: employeeData.name,
          email: employeeEmail, // Always use a valid email
          phone: normalizedPhone, // Store normalized phone without +
          photo_url: employeeData.photo_url || null,
          status: employeeData.status || "inactive",
          employment_type_id: employeeData.employment_type_id,
          employment_type: "stylist" // Setting a default value to satisfy the not-null constraint
        })
        .select()
        .single();

      if (employeeError) {
        throw new Error(`Failed to create employee: ${employeeError.message}`);
      }

      employeeId = createdEmployee.id;
      newEmployee = createdEmployee;
    }

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
      
      // Create a stable staff email using the phone number
      // Make sure it's consistent and doesn't have a changing timestamp
      const staffEmail = `staff_${normalizedPhone}@staff.internal`;
      
      console.log(`Creating new employee auth user with email: ${staffEmail}`);
      
      try {
        // Create a new auth user directly without checking if one exists
        console.log('Creating auth user with these details:');
        console.log({
          email: staffEmail,
          password: '********', // Hide for security
          phone: normalizedPhone,
          user_metadata: {
            full_name: employeeData.name,
            employee_id: employeeId,
            role: 'employee'
          }
        });
        
        // Always create a new auth user with a unique email to avoid conflicts
        const uniqueEmail = `staff_${normalizedPhone}_${Date.now()}@staff.internal`;
        
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: uniqueEmail,
          password,
          phone: normalizedPhone,
          email_confirm: true,
          user_metadata: {
            full_name: employeeData.name,
            employee_id: employeeId,
            role: 'employee'
          },
        });
        
        if (authError) {
          console.error('Error creating auth user:', authError);
          throw new Error(`Failed to create auth user: ${authError.message}`);
        }
        
        if (!authUser || !authUser.user || !authUser.user.id) {
          throw new Error('Failed to create auth user: No user ID returned');
        }
        
        console.log('Employee auth user created successfully:', authUser.user.id);
        authUserId = authUser.user.id;
        authAccountCreated = true;
      } catch (error) {
        console.error('Unexpected error during auth user creation process:', error);
        throw new Error(`Failed to create auth user: ${error.message}`);
      }
        // Link auth user to employee record
      if (authUserId) {
        console.log(`Creating profile for auth user ${authUserId} before linking to employee`);
        
        // First, ensure a profile exists for this auth user
        // Wait for the auth trigger to potentially create the profile
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if profile exists, if not create it
        const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('user_id', authUserId)
          .maybeSingle();
        
        if (!existingProfile) {
          console.log('Profile does not exist, creating it manually');
          
          // Create profile manually
          const { error: profileCreateError } = await supabaseAdmin
            .from('profiles')
            .insert({
              id: authUserId, // Profile id should match auth user id
              user_id: authUserId, // Foreign key to auth.users
              full_name: employeeData.name,
              phone_number: normalizedPhone,
              role: 'employee',
              phone_verified: true,
              communication_consent: true,
              communication_channel: 'whatsapp',
              wallet_balance: 0,
              last_used: new Date().toISOString()
            });
            
          if (profileCreateError) {
            console.error('Error creating profile for employee:', profileCreateError);
            throw new Error(`Failed to create profile for employee: ${profileCreateError.message}`);
          }
          
          console.log('Successfully created profile for employee');
        } else {
          console.log('Profile already exists, updating with employee information');
          
          // Update existing profile with employee information
          const { error: profileUpdateError } = await supabaseAdmin
            .from('profiles')
            .update({
              full_name: employeeData.name,
              phone_number: normalizedPhone,
              role: 'employee',
              phone_verified: true,
              communication_consent: true,
              communication_channel: 'whatsapp',
              last_used: new Date().toISOString()
            })
            .eq('user_id', authUserId);
            
          if (profileUpdateError) {
            console.error('Error updating profile with employee information:', profileUpdateError);
            // Don't throw here, just log the error as the profile exists
          }
        }
        
        console.log(`Now updating employee ${employeeId} with auth_id ${authUserId}`);
        
        // Now update the employee record with the auth_id (which references profiles.user_id)
        const { data: updatedEmployeeWithAuth, error: updateEmployeeError } = await supabaseAdmin
          .from("employees")
          .update({ auth_id: authUserId })
          .eq("id", employeeId)
          .select()
          .single();
          
        if (updateEmployeeError) {
          console.error('Error updating employee with auth_id:', updateEmployeeError);
          throw new Error(`Failed to update employee with auth ID: ${updateEmployeeError.message}`);
        }        
        console.log(`Successfully updated employee with auth_id. Updated employee:`, updatedEmployeeWithAuth);
        newEmployee = updatedEmployeeWithAuth;
      } else {
        console.error('No authUserId available to link to employee');
      }
    }

    // 5. Send verification or welcome message
    let messageSent = false;
    let verificationLink = "";
    let verificationCodeGenerated = false;
    
    // Generate a code for verification (6-digit number)
    const generateCode = () => {
      return Math.floor(100000 + Math.random() * 900000).toString();
    };
    
    // Generate a verification code regardless if we're sending it via link or OTP
    const verificationCode = generateCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Always create a verification code in the database for the employee
    try {
      // Make sure to strip the + sign from the phone number
      const normalizedPhone = employeeData.phone.startsWith('+') ? employeeData.phone.substring(1) : employeeData.phone;
      
      // Store the verification code in employee_verification_codes
      await supabaseAdmin
        .from("employee_verification_codes")
        .insert({
          employee_id: employeeId,
          code: verificationCode,
          expires_at: expiresAt.toISOString(),
        });
      
      // Also store the code in phone_auth_codes for compatibility with verification endpoints  
      await supabaseAdmin
        .from("phone_auth_codes")
        .insert({
          phone_number: normalizedPhone, // Store without + prefix
          code: verificationCode,
          expires_at: expiresAt.toISOString(),
          full_name: employeeData.name,
          lead_source: "employee_onboarding"
        });
      
      verificationCodeGenerated = true;
    } catch (error) {
      console.error(`Error storing verification code: ${error.message}`);
    }

    // Handle 2Factor OTP sending if requested
    if (sendOtp) {
      try {
        // Get the TwoFactor configuration
        const { data: twoFactorConfig } = await supabaseAdmin
          .from('messaging_providers')
          .select('configuration')
          .eq('provider_name', 'twofactor')
          .single();
          
        if (!twoFactorConfig) {
          throw new Error('TwoFactor configuration not found');
        }
        
        const config = twoFactorConfig.configuration;
        
        if (!config.api_key) {
          throw new Error('TwoFactor API key not found in configuration');
        }
        
        // Format the phone number (remove + if present)
        const formattedPhone = employeeData.phone.startsWith('+') 
          ? employeeData.phone.substring(1) 
          : employeeData.phone;
          
        console.log(`Sending 2Factor OTP to: ${formattedPhone}`);
        
        // Construct the API URL based on whether a template name is provided
        let apiUrl;
        if (templateName) {
          apiUrl = `https://2factor.in/API/V1/${config.api_key}/SMS/${formattedPhone}/${verificationCode}/${templateName}`;
          console.log(`Using template: ${templateName}`);
        } else {
          apiUrl = `https://2factor.in/API/V1/${config.api_key}/SMS/${formattedPhone}/${verificationCode}`;
          console.log(`Using default template`);
        }
        
        console.log(`Sending 2Factor request to: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          method: 'GET'
        });
        
        const responseData = await response.json();
        console.log("2Factor API response:", responseData);
        
        if (!response.ok || responseData.Status !== "Success") {
          console.error("2Factor API error:", responseData);
          throw new Error(`Failed to send message: ${responseData.Details || JSON.stringify(responseData)}`);
        }
        
        // Log the session ID from the response
        const sessionId = responseData.Details;
        console.log(`OTP sent successfully with session ID: ${sessionId}`);
        
        // Record the sent message in the database for tracking
        try {
          await supabaseAdmin.from('message_logs').insert({
            provider: 'twofactor',
            message_type: 'otp',
            recipient: formattedPhone,
            status: 'sent',
            template_name: templateName || 'default',
            session_id: sessionId,
            employee_id: employeeId
          });
          console.log("OTP logged to database successfully");
        } catch (dbError) {
          console.error("Failed to log OTP to database:", dbError);
        }
        
        messageSent = true;
      } catch (error) {
        console.error(`Error sending 2Factor OTP: ${error.message}`);
        throw new Error(`Error sending verification code: ${error.message}`);
      }
    }
    else if (sendVerificationLink || sendWelcomeMessage) {
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
              token += charset[randomIndex]; // Fixed: use the random character from charset
            }
            return token;
          };
          
          const verificationToken = generateToken();
          
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
        verificationCode: sendOtp ? verificationCode : undefined, // Only include if explicitly requested
        verificationCodeGenerated,
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
    
    console.log(`Attempting to delete auth user and profile for user ID: ${authUserId}`);
    
    // Step 1: Delete the profile record first
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', authUserId);
      
    if (profileError) {
      console.error(`Error deleting profile for user ID ${authUserId}:`, profileError);
      // Continue with auth user deletion even if profile deletion fails
      console.log(`Proceeding to delete auth user ${authUserId} despite profile deletion error`);
    } else {
      console.log(`Successfully deleted profile for user ID: ${authUserId}`);
    }
    
    // Step 2: Delete the auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
    
    if (error) throw error;
    
    console.log(`Successfully deleted auth user: ${authUserId}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Auth user and profile deleted successfully",
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
