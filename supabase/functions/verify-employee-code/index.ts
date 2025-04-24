
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.26.0'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { code, phoneNumber, token } = await req.json()
    
    if (!code && !token) {
      throw new Error('Either verification code or token is required')
    }
    
    if (!phoneNumber) {
      throw new Error('Phone number is required')
    }
    
    // Create Supabase client with admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    )
    
    // Get the employee ID from phone number
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('phone', phoneNumber)
      .single()
    
    if (employeeError || !employeeData) {
      throw new Error('Employee not found with this phone number')
    }
    
    const employeeId = employeeData.id
    let isVerified = false
    
    // If token provided, verify with token
    if (token) {
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('employee_verification_links')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('verification_token', token)
        .eq('used', false)
        .single()
      
      if (tokenError || !tokenData) {
        throw new Error('Invalid or expired verification link')
      }
      
      // Check if token has expired
      const expiresAt = new Date(tokenData.expires_at)
      const currentTime = new Date()
      
      if (currentTime > expiresAt) {
        throw new Error('Verification link has expired')
      }
      
      // Mark the token as used
      await supabaseAdmin
        .from('employee_verification_links')
        .update({ used: true })
        .eq('id', tokenData.id)
      
      isVerified = true
    }
    
    // If code provided, verify code
    if (code && !isVerified) {
      // Verify code from database
      const { data: otpData, error: otpError } = await supabaseAdmin
        .from('employee_verification_codes')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('code', code)
        .single()
        
      if (otpError || !otpData) {
        throw new Error('Invalid verification code')
      }
      
      // Check if code has expired
      const expiresAt = new Date(otpData.expires_at)
      const currentTime = new Date()
      
      if (currentTime > expiresAt) {
        throw new Error('Verification code has expired')
      }
      
      isVerified = true
    }
    
    if (!isVerified) {
      throw new Error('Verification failed')
    }
    
    // Update employee status to active
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({ status: 'active' })
      .eq('id', employeeId)
    
    if (updateError) {
      throw new Error(`Failed to activate employee: ${updateError.message}`)
    }
    
    // Mark as phone_verified in profile
    const { data: profileData, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone_number', phoneNumber)
    
    if (!profileFetchError && profileData?.length > 0) {
      await supabaseAdmin
        .from('profiles')
        .update({ phone_verified: true })
        .eq('phone_number', phoneNumber)
    }
    
    // Delete the used verification code
    await supabaseAdmin
      .from('employee_verification_codes')
      .delete()
      .eq('employee_id', employeeId)
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Employee verified successfully',
        employeeId
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200 
      }
    )
  } catch (error: any) {
    console.error('Error verifying code:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error.message || "Unknown error occurred" 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200 
      }
    )
  }
})
