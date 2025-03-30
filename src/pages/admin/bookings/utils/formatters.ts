
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

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(amount);
};
