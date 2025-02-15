
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const { purchaseOrderId } = await req.json();

    // Fetch purchase order details with items and supplier
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        supplier:suppliers(*),
        items:purchase_order_items(
          *,
          item:inventory_items(*)
        )
      `)
      .eq("id", purchaseOrderId)
      .single();

    if (poError) throw poError;

    // Generate email HTML
    const itemsList = po.items
      .map(
        (item: any) => `
        <tr>
          <td>${item.item.name}</td>
          <td>${item.quantity}</td>
          <td>$${item.purchase_price}</td>
          <td>$${item.quantity * item.purchase_price}</td>
        </tr>
      `
      )
      .join("");

    const total = po.items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.purchase_price,
      0
    );

    const html = `
      <h1>Purchase Order #${po.invoice_number}</h1>
      <p>Dear ${po.supplier.name},</p>
      <p>Please find below our purchase order request:</p>
      
      <table border="1" cellpadding="10" style="border-collapse: collapse;">
        <tr>
          <th>Item</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
        ${itemsList}
        <tr>
          <td colspan="3" style="text-align: right;"><strong>Total:</strong></td>
          <td>$${total}</td>
        </tr>
      </table>

      <p>Please process this order at your earliest convenience.</p>
      
      <p>Best regards,<br>${Deno.env.get("COMPANY_NAME")}</p>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "orders@yourdomain.com",
      to: po.supplier.email,
      subject: `Purchase Order #${po.invoice_number}`,
      html: html,
    });

    // Update PO status
    const { error: updateError } = await supabase
      .from("purchase_orders")
      .update({ status: "sent" })
      .eq("id", purchaseOrderId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-po-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
