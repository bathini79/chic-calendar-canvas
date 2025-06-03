import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import { format, addDays } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CalendarIcon } from 'lucide-react';
import { payPeriodService } from '@/services/payPeriodService';

export default function PayPeriods() {
  const { toast } = useToast();
  const [frequency, setFrequency] = useState<'monthly' | 'custom'>('monthly');
  const [startDayOfMonth, setStartDayOfMonth] = useState<number>(1);
  const [customDays, setCustomDays] = useState<number>(14);
  const [startDate, setStartDate] = useState<Date | null>(new Date());  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch current settings from database
  useEffect(() => {
    async function fetchSettings() {
      try {
        const config = await payPeriodService.getPayPeriodSettings();
        if (config) {
          setFrequency(config.frequency);
          setStartDayOfMonth(config.start_day_of_month || 1);
          setCustomDays(config.custom_days || 14);
          if (config.next_start_date) {
            setStartDate(new Date(config.next_start_date));
          }
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to fetch settings",
          variant: "destructive",
        });
      }
    }
    
    fetchSettings();
  }, []);
    const handleSaveSettings = async () => {
    if (!startDate) {
      toast({
        title: "Error",
        description: "Please select a start date",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const configData = {
        frequency,
        start_day_of_month: frequency === 'monthly' ? startDayOfMonth : null,
        custom_days: frequency === 'custom' ? customDays : null,
        next_start_date: startDate.toISOString(),
      };
      
      await payPeriodService.upsertPayPeriodSettings(configData);
      
      toast({
        title: "Success",
        description: "Pay period settings updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const getNextPayPeriodPreview = () => {
    if (!startDate) return null;
    
    const endDate = frequency === 'monthly' 
      ? new Date(startDate.getFullYear(), startDate.getMonth() + 1, startDayOfMonth - 1) 
      : addDays(startDate, customDays);
      
    return {
      start: format(startDate, 'MMM dd, yyyy'),
      end: format(endDate, 'MMM dd, yyyy'),
    };
  };
  
  const preview = getNextPayPeriodPreview();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Pay Period Settings</h3>
        <p className="text-sm text-gray-500">Configure how pay periods are calculated for your team.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Pay Period Configuration</CardTitle>
          <CardDescription>
            Set up how pay periods are calculated for payroll processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Frequency</Label>
            <RadioGroup
              value={frequency} 
              onValueChange={(value) => setFrequency(value as 'monthly' | 'custom')}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly">Monthly</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom">Custom</Label>
              </div>
            </RadioGroup>
          </div>
          
          {frequency === 'monthly' ? (
            <div className="space-y-2">
              <Label>Start Day of Month</Label>
              <Input 
                type="number" 
                min={1} 
                max={28} 
                value={startDayOfMonth}
                onChange={(e) => setStartDayOfMonth(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-gray-500">
                Pay periods will run from this day of the month to the day before in the following month.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Number of Days</Label>
              <Input 
                type="number" 
                min={1} 
                value={customDays}
                onChange={(e) => setCustomDays(parseInt(e.target.value) || 14)}
              />
              <p className="text-xs text-gray-500">
                Pay periods will be this many days long.
              </p>
            </div>
          )}
            <div className="space-y-2">
            <Label>First Pay Period Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? (
                    format(startDate, "PPP")
                  ) : (
                    <span>Select start date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {preview && (
            <div className="p-4 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium mb-2">Next Pay Period Preview</h4>
              <p className="text-sm">
                {preview.start} to {preview.end}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSaveSettings}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}