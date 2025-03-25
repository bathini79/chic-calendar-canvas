
import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface RetentionInsightsProps {
  recommendations: string[];
}

export function RetentionInsights({ recommendations }: RetentionInsightsProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-md bg-muted/30">
        <div className="flex items-center space-x-2 mb-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <h3 className="text-sm font-medium">Customer Retention Analysis</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Customer retention is 5x more cost-effective than acquiring new customers. 
          A 5% increase in retention can increase profits by 25-95%.
        </p>
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-2">Recommended Actions:</h3>
        <ul className="space-y-2">
          {recommendations.map((recommendation, index) => (
            <li key={index} className="flex items-start space-x-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>{recommendation}</span>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t text-sm">
        <div className="text-muted-foreground">
          Next review recommended in 30 days
        </div>
        <div className="flex items-center space-x-1 text-primary">
          <span>View detailed report</span>
          <ExternalLink className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}

const ExternalLink = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" x2="21" y1="14" y2="3" />
  </svg>
);
