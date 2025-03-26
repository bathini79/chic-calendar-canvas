
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface ChurnReason {
  id: string;
  name: string;
  value: number;
}

interface ChurnReasonAnalysisProps {
  reasons: ChurnReason[];
}

export function ChurnReasonAnalysis({ reasons }: ChurnReasonAnalysisProps) {
  if (!reasons || reasons.length === 0) return null;
  
  // Sort reasons by value, descending
  const sortedReasons = [...reasons].sort((a, b) => b.value - a.value);
  
  // Format data for the chart
  const chartData = sortedReasons.map(reason => ({
    name: reason.name,
    value: reason.value,
    color: getColorForReason(reason.id)
  }));
  
  // Create chart config based on reasons
  const chartConfig = chartData.reduce((acc, item) => {
    acc[item.name] = {
      label: item.name,
      color: item.color
    };
    return acc;
  }, {} as Record<string, { label: string, color: string }>);
  
  // Custom color scheme based on reason type
  function getColorForReason(id: string): string {
    switch (id) {
      case 'service':
        return '#f43f5e'; // Rose
      case 'schedule':
        return '#ec4899'; // Pink
      case 'price':
        return '#8b5cf6'; // Violet
      case 'personal':
        return '#3b82f6'; // Blue
      case 'engagement':
        return '#06b6d4'; // Cyan
      default:
        return '#8b5cf6'; // Default violet
    }
  }

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Reasons for Churn</CardTitle>
          <CardDescription>What's causing customers to leave or reduce engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `${value}%`}
                    domain={[0, 100]}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={150}
                    tickFormatter={(value) => {
                      return value.length > 20 ? `${value.substring(0, 20)}...` : value;
                    }}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          <Info className="h-3 w-3 mr-1" /> 
          Percentages reflect the distribution of reasons given by churned customers
        </CardFooter>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
              Top Churn Drivers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedReasons.slice(0, 3).map((reason, index) => (
              <div key={reason.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                  {index + 1}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="font-medium text-sm">{reason.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {getReasonDescription(reason.id)}
                  </div>
                </div>
                <div className="font-medium">{reason.value}%</div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
              Recommended Solutions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedReasons.slice(0, 3).map((reason) => (
              <div key={reason.id} className="space-y-1">
                <div className="font-medium text-sm">For {reason.name}:</div>
                <div className="text-sm text-muted-foreground">
                  {getReasonSolution(reason.id)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Understanding Churn Drivers</CardTitle>
          <CardDescription>Key factors that influence customer churn in salon & spa businesses</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Main Categories of Churn Drivers</h3>
            <ul className="space-y-3">
              <li className="text-sm space-y-1">
                <div className="font-medium">Service Quality Issues</div>
                <div className="text-muted-foreground">
                  Inconsistent results, stylist turnover, and inability to meet expectations consistently.
                </div>
              </li>
              
              <li className="text-sm space-y-1">
                <div className="font-medium">Operational Friction</div>
                <div className="text-muted-foreground">
                  Long wait times, difficulty booking appointments, and inefficient processes.
                </div>
              </li>
              
              <li className="text-sm space-y-1">
                <div className="font-medium">Value Perception</div>
                <div className="text-muted-foreground">
                  Pricing that doesn't align with perceived value or competitive offerings.
                </div>
              </li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Monitoring & Data Collection</h3>
            <p className="text-sm text-muted-foreground">
              Regularly collect customer feedback through:
            </p>
            <ul className="space-y-2">
              <li className="text-sm flex items-start">
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                <span>Post-service satisfaction surveys</span>
              </li>
              <li className="text-sm flex items-start">
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                <span>Exit surveys for clients who haven't returned</span>
              </li>
              <li className="text-sm flex items-start">
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                <span>Social media and review site monitoring</span>
              </li>
              <li className="text-sm flex items-start">
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                <span>Direct client interviews and feedback sessions</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Helper function to get reason descriptions
function getReasonDescription(id: string): string {
  switch (id) {
    case 'service':
      return 'Inconsistent results and variable quality of services depending on staff or visit.';
    case 'schedule':
      return 'Difficulty booking preferred times, long wait times, or schedule changes.';
    case 'price':
      return 'Better deals or promotions from competitors, or perceived value issues.';
    case 'personal':
      return 'Generic service experiences that don't address individual preferences or needs.';
    case 'engagement':
      return 'Lack of follow-up communication or relationship building between visits.';
    default:
      return 'Various factors affecting customer satisfaction and retention.';
  }
}

// Helper function to get reason solutions
function getReasonSolution(id: string): string {
  switch (id) {
    case 'service':
      return 'Implement standardized training programs and service protocols. Create detailed client preference profiles and consistent quality checks.';
    case 'schedule':
      return 'Optimize appointment scheduling with better online booking options. Implement SMS/email reminders and flexible booking windows.';
    case 'price':
      return 'Develop tiered service packages with clear value propositions. Create a loyalty program offering increasing benefits for repeat visits.';
    case 'personal':
      return 'Build detailed customer profiles with preferences, history, and photos. Implement personalized follow-ups and service customization.';
    case 'engagement':
      return 'Set up automated engagement sequences with personalized content. Implement regular check-ins and feedback collection between visits.';
    default:
      return 'Address specific issues with targeted improvements to service quality, convenience, and customer experience.';
  }
}
