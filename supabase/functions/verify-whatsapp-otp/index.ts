
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Hello from verify-whatsapp-otp function!")

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { phoneNumber, code, fullName, leadSource } = await req.json()
    console.log(`Verifying OTP for phone: ${phoneNumber}, code: ${code}, fullName: ${fullName || 'not provided'}, leadSource: ${leadSource || 'not provided'}`)

    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if the OTP is valid
    const { data: otpData, error: otpError } = await supabase
      .from('phone_auth_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (otpError || !otpData) {
      console.error('Error retrieving OTP:', otpError)
      return new Response(
        JSON.stringify({ error: 'invalid_otp', message: 'Invalid or expired OTP. Please request a new code.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if OTP is expired (15 minutes)
    const expiryTime = new Date(otpData.expires_at)
    if (new Date() > expiryTime) {
      console.error('OTP expired')
      return new Response(
        JSON.stringify({ error: 'expired_otp', message: 'OTP has expired. Please request a new code.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Verify the OTP
    if (otpData.code !== code) {
      console.error('OTP mismatch')
      return new Response(
        JSON.stringify({ error: 'invalid_otp', message: 'Invalid OTP. Please check and try again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Clean the phone number for auth compatibility
    // For example, convert +91XXXXXXXXXX to just the number part
    const cleanPhone = phoneNumber.replace(/\+/g, '')

    // Check if a user already exists with this phone number
    const { data: existingUser, error: userCheckError } = await supabase
      .from('profiles')
      .select('id, phone_number, full_name, phone_verified')
      .eq('phone_number', phoneNumber)
      .limit(1)
      .single()

    let userId
    let isNewUser = false

    if (!existingUser) {
      // New user - require full name
      if (!fullName) {
        console.log('New user requires full name')
        return new Response(
          JSON.stringify({ error: 'new_user_requires_name', message: 'Please provide your full name to register.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Create a new user in auth
      const { data: newAuthUser, error: signUpError } = await supabase.auth.signUp({
        phone: phoneNumber,
        options: {
          data: {
            phone: phoneNumber,
            phone_confirmed_at: new Date().toISOString(),
            full_name: fullName,
          }
        }
      })

      if (signUpError || !newAuthUser.user) {
        console.error('Error creating new user:', signUpError)
        return new Response(
          JSON.stringify({ error: 'registration_failed', message: 'Registration failed. Please try again.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      userId = newAuthUser.user.id
      isNewUser = true

      // Add lead_source to the profile if provided
      if (leadSource) {
        // Update the profile with the lead source
        await supabase
          .from('profiles')
          .update({ lead_source: leadSource })
          .eq('id', userId);
      }

      console.log(`New user created with ID: ${userId}`)
    } else {
      userId = existingUser.id

      // Sign in the existing user
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPhone({
        phone: phoneNumber,
        options: {
          data: {
            phone_confirmed_at: new Date().toISOString(),
          }
        }
      })

      if (signInError) {
        console.error('Error signing in existing user:', signInError)
        return new Response(
          JSON.stringify({ error: 'login_failed', message: 'Login failed. Please try again.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      // Update the profile phone_verified flag if not already set
      if (!existingUser.phone_verified) {
        await supabase
          .from('profiles')
          .update({ phone_verified: true })
          .eq('id', userId)
      }

      console.log(`Existing user signed in: ${userId}`)
    }

    // Delete the used OTP
    await supabase
      .from('phone_auth_codes')
      .delete()
      .eq('id', otpData.id)

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        isNewUser, 
        message: isNewUser ? 'Registration successful!' : 'Login successful!' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'server_error', message: 'An unexpected error occurred.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
