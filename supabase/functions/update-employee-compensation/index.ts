import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

interface CompensationData {
  baseAmount: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

interface RequestData {
  employeeId: string;
  compensation: CompensationData;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { employeeId, compensation } = (await req.json()) as RequestData;

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First delete any existing compensation records
    const { error: deleteError } = await supabaseClient
      .from('employee_compensation_settings')
      .delete()
      .eq('employee_id', employeeId);

    if (deleteError) throw deleteError;

    // Insert new compensation record
    const { data, error: insertError } = await supabaseClient
      .from('employee_compensation_settings')
      .insert({
        employee_id: employeeId,
        base_amount: compensation.baseAmount,
        effective_from: compensation.effectiveFrom,
        effective_to: compensation.effectiveTo,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        success: true,
        data
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
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      }
    );
  }
});
