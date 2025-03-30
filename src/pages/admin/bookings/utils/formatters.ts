
export const formatRefundReason = (reason: string): string => {
  const reasons: Record<string, string> = {
    'customer_dissatisfaction': 'Customer Dissatisfaction',
    'service_quality_issue': 'Service Quality Issue',
    'scheduling_error': 'Scheduling Error',
    'health_concern': 'Health Concern',
    'price_dispute': 'Price Dispute',
    'other': 'Other'
  };
  return reasons[reason] || reason;
};
