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
    const url = new URL(req.url)
    
    // Get the Meta WhatsApp config in query parameters for direct testing
    const verifyTokenParam = url.searchParams.get('verify_token')
    
    if (req.method === 'GET') {
      // This is an immediate test with provided parameters
      if (verifyTokenParam) {
        // Get parameters for the test
        const mode = url.searchParams.get('hub.mode') || url.searchParams.get('mode')
        const token = url.searchParams.get('hub.verify_token') || url.searchParams.get('token') || verifyTokenParam
        const challenge = url.searchParams.get('hub.challenge') || url.searchParams.get('challenge') || 'test_challenge'
        
        console.log('Webhook test request parameters:', {
          mode,
          token: token ? '********' : undefined, // Don't log the actual token
          challenge,
          expected_token: verifyTokenParam ? '********' : undefined // Don't log the actual token
        })
        
        // Verify test parameters
        if (mode === 'subscribe' && token === verifyTokenParam) {
          console.log('Webhook verification test successful')
          return new Response(challenge, { 
            headers: { 'Content-Type': 'text/plain' },
            status: 200 
          })
        } else {
          console.error('Webhook test verification failed:', { 
            mode,
            token_match: token === verifyTokenParam,
            mode_is_subscribe: mode === 'subscribe'
          })
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Verification test failed',
              details: {
                mode_is_subscribe: mode === 'subscribe',
                token_match: token === verifyTokenParam,
                challenge_received: !!challenge,
                expected_token_length: verifyTokenParam?.length || 0,
                received_token_length: token?.length || 0
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
      }
      
      // Otherwise display a help page
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Meta WhatsApp Webhook Test</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; }
            h1 { color: #333; }
            .tip { background: #f5f5f5; padding: 15px; border-left: 4px solid #4CAF50; margin-bottom: 20px; }
            code { background: #f1f1f1; padding: 2px 5px; border-radius: 3px; }
            pre { background: #f1f1f1; padding: 10px; border-radius: 5px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <h1>Meta WhatsApp Webhook Test Tool</h1>
          <div class="tip">
            <strong>Tip:</strong> This page helps you test your Meta WhatsApp webhook verification.
          </div>
          
          <h2>Step 1: Add your verify token to test</h2>
          <form id="test-form">
            <p>
              <label for="verify-token">Your verify token:</label><br>
              <input type="text" id="verify-token" name="verify_token" style="width: 300px; padding: 5px;" placeholder="Enter your verify token here">
            </p>
            <button type="submit" style="padding: 5px 10px;">Test Verification</button>
          </form>
          
          <h2>Step 2: Use the URL in Meta Dashboard</h2>
          <p>URL format for Meta Webhook verification:</p>
          <pre>${url.origin}/functions/v1/test-webhook-verification?verify_token=YOUR_TOKEN</pre>

          <script>
            document.getElementById('test-form').addEventListener('submit', async (e) => {
              e.preventDefault();
              const token = document.getElementById('verify-token').value;
              if (!token) {
                alert('Please enter a verify token');
                return;
              }
              
              const testUrl = \`${url.origin}/functions/v1/test-webhook-verification?verify_token=\${encodeURIComponent(token)}&mode=subscribe&challenge=test_challenge&token=\${encodeURIComponent(token)}\`;
              
              try {
                const response = await fetch(testUrl);
                const result = await response.text();
                
                if (response.ok && result === 'test_challenge') {
                  alert('Success! Your webhook verification parameters are correct. You should be able to verify your webhook in the Meta Dashboard.');
                } else {
                  alert(\`Test failed. Response: \${result}\`);
                }
              } catch (error) {
                alert(\`Error: \${error.message}\`);
              }
            });
          </script>
        </body>
        </html>
        `,
        { 
          headers: { 'Content-Type': 'text/html' },
          status: 200 
        }
      )
    }
    
    // For POST requests, return a simple success response
    return new Response(
      JSON.stringify({ success: true, message: 'Webhook test endpoint is working' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
    
  } catch (error) {
    console.error('Error in test webhook:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})