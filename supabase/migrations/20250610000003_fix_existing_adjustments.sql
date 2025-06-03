-- Fix existing adjustments that might have been automatically paid
-- This script will find any manual adjustments in draft pay runs that are incorrectly marked as paid
-- and will set them back to unpaid

UPDATE pay_run_items pri
SET is_paid = FALSE,
    paid_date = NULL,
    payment_reference = NULL
FROM pay_runs pr
WHERE pri.pay_run_id = pr.id
AND pr.status != 'paid'  -- Only affect items in non-paid pay runs
AND pri.source_type = 'manual' -- Only affect manual adjustments
AND pri.is_paid = TRUE; -- Only affect items incorrectly marked as paid
