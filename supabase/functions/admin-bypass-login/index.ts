import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: "phone_required", message: "Phone number is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Normalize: strip leading +
    const normalized = phoneNumber.startsWith("+") ? phoneNumber.substring(1) : phoneNumber;

    // Check against allowed bypass numbers secret (comma-separated, no +)
    const bypassPhonesRaw = Deno.env.get("ADMIN_BYPASS_PHONES") ?? "";
    const bypassPhones = bypassPhonesRaw.split(",").map((p) => p.trim()).filter(Boolean);

    if (!bypassPhones.includes(normalized)) {
      return new Response(
        JSON.stringify({ bypass: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = `admin_${normalized}@bypass.internal`;
    const tempPassword = crypto.randomUUID();

    // Check if auth user already exists
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = users?.find((u) => u.email === email);

    let userId: string;

    if (existingAuthUser) {
      // User exists — just update password for this session
      userId = existingAuthUser.id;
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: tempPassword,
      });
      if (updateError) {
        return new Response(
          JSON.stringify({ error: "credential_update_failed", message: updateError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    } else {
      // Create auth user (inserts into auth.users)
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        raw_user_meta_data: {
          phone: normalized,
          role: "admin",
          full_name: "Admin",
        },
      });

      if (createError || !newUser.user) {
        return new Response(
          JSON.stringify({ error: "user_creation_failed", message: createError?.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      userId = newUser.user.id;

      // Insert into profiles
      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: userId,
        user_id: userId,
        phone_number: normalized,
        phone_verified: true,
        full_name: "Admin",
        role: "admin",
        wallet_balance: 0,
        communication_consent: true,
        communication_channel: "whatsapp",
        visit_count: 0,
        referral_wallet: 0,
      });

      if (profileError) {
        console.error("Profile insert error:", profileError);
        // Non-fatal — auth user was created, login can still proceed
      }
    }

    return new Response(
      JSON.stringify({
        bypass: true,
        credentials: { email, password: tempPassword },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("admin-bypass-login error:", err);
    return new Response(
      JSON.stringify({ error: "unknown_error", message: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
