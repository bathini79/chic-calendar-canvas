# Pay Run Summary Edge Function

This edge function calculates pay run summary statistics for the payroll system. It efficiently processes payroll data at the edge for better performance and scalability.

## Purpose

The function calculates important metrics for a pay run, including:
- Earnings (base salary and wages)
- Other compensation (tips, commissions, adjustments)
- Total amount
- Paid amount
- Amount to pay (total - paid)
- Total number of employees

## Usage

Send a POST request to the function with a JSON body containing the pay run ID:

```json
{
  "payRunId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Response

The function returns a JSON object with the calculated summary:

```json
{
  "earnings": 5000,
  "other": 1500,
  "total": 6500,
  "paid": 1500,
  "toPay": 5000,
  "total_employees": 10
}
```

## Error Handling

If an error occurs, the function returns a JSON response with status code 400:

```json
{
  "error": "Error message",
  "success": false
}
```

## Implementation Details

- Uses parallel processing to fetch pay run data and pay run items simultaneously
- Optimizes employee count calculation by using existing data instead of additional queries
- Implements caching headers for improved performance
- Handles errors gracefully with detailed logging

## Deployment Instructions

Deploy using the Supabase CLI:

```bash
supabase functions deploy pay-run-summary --project-ref [YOUR_PROJECT_REF]
```
