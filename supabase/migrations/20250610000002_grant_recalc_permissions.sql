-- Grant permissions for the updated recalculate_commissions_for_pay_run function
-- The function has SECURITY DEFINER which allows it to disable/enable triggers without direct ALTER permissions
-- Additionally granting TRIGGER permission on the table

-- Grant execute permissions on the function
GRANT EXECUTE ON FUNCTION "public"."recalculate_commissions_for_pay_run"("pay_run_id_param" "uuid") TO "anon";
GRANT EXECUTE ON FUNCTION "public"."recalculate_commissions_for_pay_run"("pay_run_id_param" "uuid") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."recalculate_commissions_for_pay_run"("pay_run_id_param" "uuid") TO "service_role";

-- Grant TRIGGER permissions on the pay_run_items table to allow disabling/enabling triggers
GRANT TRIGGER ON TABLE "public"."pay_run_items" TO "authenticated";
GRANT TRIGGER ON TABLE "public"."pay_run_items" TO "service_role";
