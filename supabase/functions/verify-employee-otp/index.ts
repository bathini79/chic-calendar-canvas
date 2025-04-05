
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
    const { phoneNumber, code, employeeId } = await req.json()
    
    if (!phoneNumber || !code || !employeeId) {
      throw new Error('Phone number, verification code, and employee ID are required')
    }
    
    console.log("Request received:", { phoneNumber, code, employeeId });
    
    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase credentials not configured')
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Verify OTP from database
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('phone_auth_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('code', code)
      .single()
      
    if (otpError || !otpData) {
      console.error('OTP verification error:', otpError)
      return new Response(
        JSON.stringify({ 
          error: 'invalid_code',
          message: 'Invalid verification code'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Using 200 to avoid non-2xx handling issues
        }
      )
    }
    
    // Check if OTP has expired
    const expiresAt = new Date(otpData.expires_at)
    const currentTime = new Date()
    
    if (currentTime > expiresAt) {
      console.error('OTP expired')
      return new Response(
        JSON.stringify({ 
          error: 'code_expired',
          message: 'Verification code has expired'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }
    
    // Update employee status to active
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({ status: 'active' })
      .eq('id', employeeId)
      .eq('phone', phoneNumber);
      
    if (updateError) {
      console.error('Error updating employee status:', updateError)
      return new Response(
        JSON.stringify({ 
          error: 'update_failed',
          message: 'Failed to update employee status'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }
    
    // Delete used OTP
    await supabaseAdmin
      .from('phone_auth_codes')
      .delete()
      .eq('phone_number', phoneNumber)
    
    // Return success
    return new Response(
      JSON.stringify({ 
        message: 'Employee verified successfully',
        employeeId: employeeId,
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
    console.error('Error verifying employee OTP:', error)
    
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
    )
  }
})
