
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { CheckCircle2, BellRing, Gift, UserCheck, MessageSquare, BarChart4, Clock } from 'lucide-react';

export function ChurnReductionStrategies() {
  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Churn Reduction Strategies</CardTitle>
          <CardDescription>
            Proven approaches to improve customer retention in salon & spa businesses
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <StrategyCard
            icon={<BellRing className="h-5 w-5 text-pink-500" />}
            title="Automated Reminders"
            description="Send timely SMS/WhatsApp reminders for appointments and follow-ups"
            steps={[
              "Set up automated appointment confirmations 24-48 hours before scheduled time",
              "Implement rebooking reminders 2-3 weeks after service for recurring appointments",
              "Send personalized check-ins for clients who haven't visited in 60+ days"
            ]}
          />
          
          <StrategyCard
            icon={<Gift className="h-5 w-5 text-purple-500" />}
            title="Loyalty Programs"
            description="Reward repeat customers with points, discounts and exclusive perks"
            steps={[
              "Create a tiered loyalty program with increasing benefits at each level",
              "Offer points for services, product purchases, and referrals",
              "Provide exclusive member-only services and early access to promotions"
            ]}
          />
          
          <StrategyCard
            icon={<UserCheck className="h-5 w-5 text-blue-500" />}
            title="Personalized Engagement"
            description="Tailor communications and offers based on customer preferences"
            steps={[
              "Send birthday and anniversary offers with personalized service recommendations",
              "Create detailed customer profiles to track preferences and history",
              "Segment communications based on service history and customer behavior"
            ]}
          />
          
          <StrategyCard
            icon={<Clock className="h-5 w-5 text-indigo-500" />}
            title="Subscription Models"
            description="Implement monthly memberships with valuable benefits"
            steps={[
              "Create flexible membership tiers with monthly/quarterly/annual options",
              "Include service discounts, priority booking, and product allowances",
              "Design attractive cancellation policies with easy pause/resume options"
            ]}
          />
          
          <StrategyCard
            icon={<MessageSquare className="h-5 w-5 text-cyan-500" />}
            title="Feedback & Sentiment Analysis"
            description="Identify dissatisfaction early and address issues proactively"
            steps={[
              "Implement post-service satisfaction surveys with actionable metrics",
              "Monitor and respond to online reviews and social media mentions",
              "Conduct periodic client interviews to gather qualitative feedback"
            ]}
          />
          
          <StrategyCard
            icon={<BarChart4 className="h-5 w-5 text-emerald-500" />}
            title="Value-Driven Pricing"
            description="Ensure pricing structures align with perceived value"
            steps={[
              "Create service bundles and packages with clear value propositions",
              "Implement strategic seasonal promotions for retention-focused services",
              "Develop multi-visit passes and prepaid service packages for repeat clients"
            ]}
          />
        </CardContent>
        <CardFooter className="border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Most effective results come from implementing multiple strategies in combination. 
            Start with the areas that address your specific churn drivers.
          </p>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Implementation Guide</CardTitle>
          <CardDescription>
            Step-by-step approach to rolling out retention strategies effectively
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Phase 1: Assessment & Planning (1-2 weeks)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="h-5 w-5 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                    1
                  </div>
                  <p className="text-sm">Analyze current churn data and identify primary churn types</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="h-5 w-5 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                    2
                  </div>
                  <p className="text-sm">Conduct a competitive analysis of retention strategies in your market</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="h-5 w-5 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                    3
                  </div>
                  <p className="text-sm">Set specific retention goals with measurable KPIs</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="h-5 w-5 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                    4
                  </div>
                  <p className="text-sm">Prioritize strategies based on your specific churn drivers</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Phase 2: Implementation (4-6 weeks)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="h-5 w-5 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                    5
                  </div>
                  <p className="text-sm">Set up technical infrastructure for your chosen strategies</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="h-5 w-5 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                    6
                  </div>
                  <p className="text-sm">Create marketing materials and staff training resources</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="h-5 w-5 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                    7
                  </div>
                  <p className="text-sm">Roll out strategies in phases, starting with quick wins</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="h-5 w-5 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                    8
                  </div>
                  <p className="text-sm">Train staff on new processes and customer engagement techniques</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Phase 3: Optimization (Ongoing)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="h-5 w-5 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                    9
                  </div>
                  <p className="text-sm">Monitor retention metrics weekly and adjust strategies as needed</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="h-5 w-5 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                    10
                  </div>
                  <p className="text-sm">Conduct A/B testing on different approaches to optimize results</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="h-5 w-5 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                    11
                  </div>
                  <p className="text-sm">Gather customer feedback on new retention initiatives</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="h-5 w-5 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                    12
                  </div>
                  <p className="text-sm">Conduct quarterly reviews and strategy refinements</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

interface StrategyCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  steps: string[];
}

function StrategyCard({ icon, title, description, steps }: StrategyCardProps) {
  return (
    <div className="border rounded-lg p-4 h-full">
      <div className="flex items-center space-x-2 mb-3">
        {icon}
        <h3 className="font-medium">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start space-x-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
