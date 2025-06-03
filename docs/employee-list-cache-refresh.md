# Employee List Cache Refresh After Adding Adjustments

## Issue
When adding adjustments to an employee in the payroll system, the employee list was not automatically refreshing with the latest data. This was because the React Query cache invalidation was incomplete - only the pay run details and summary were being invalidated, but not the employee summaries.

## Solution

The solution adds proper cache invalidation for the employee summaries query after adding an adjustment:

1. Updated the `addAdjustment` mutation in `use-payroll.ts` to invalidate and refetch the employee summaries query:
```typescript
onSuccess: (data) => {
  // Invalidate all relevant queries to ensure UI consistency
  queryClient.invalidateQueries({ queryKey: ['pay-run-details', data.pay_run_id] });
  queryClient.invalidateQueries({ queryKey: ['pay-run-summary', data.pay_run_id] });
  queryClient.invalidateQueries({ queryKey: ['pay-run-employee-summaries', data.pay_run_id] });
  // Force refetch to ensure immediate UI update
  queryClient.refetchQueries({ queryKey: ['pay-run-employee-summaries', data.pay_run_id] });
}
```

2. Enhanced the `handleSubmit` function in `AdjustmentModal.tsx` with better logging and clearer callback handling to ensure proper UI refresh.

## Architecture Context

The application uses React Query for data fetching and cache management. The employee list in the payroll system relies on the `pay-run-employee-summaries` query to display current payment data. This change ensures that when an adjustment is added, all related caches are properly invalidated, leading to an automatic refresh of the employee data in the UI.

## Testing

To verify this fix:
1. Open a pay run
2. Add an adjustment to an employee
3. Confirm that the employee list automatically updates with the new totals without requiring a manual refresh
