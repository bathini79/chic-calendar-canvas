
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    // Get origin from request headers or use Supabase URL
    const origin = req.headers.get('origin') || Deno.env.get('SUPABASE_URL') || 'https://oygmfedzibzxojqirgxo.supabase.co';
    
    return new Response(
      JSON.stringify({
        success: true,
        origin: origin
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
    console.error('Error in get-app-url:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    );
  }
});
