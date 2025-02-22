
import { createClient } from '@supabase/supabase-js'
import { serve } from 'https://deno.fresh.dev/std@v9.6.1/http/server.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

interface RequestBody {
  email: string
  full_name: string
  phone_number?: string
  password: string
}

serve(async (req) => {
  try {
    const { email, full_name, phone_number, password } = await req.json() as RequestBody

    // Create user with service role client
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      }
    })

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Update phone number if provided
    if (phone_number) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ phone_number })
        .eq('id', authData.user.id)

      if (updateError) {
        console.error('Error updating phone number:', updateError)
      }
    }

    // Fetch the created profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ data: profileData }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
