import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LoaderCircle } from "lucide-react";

// Define schema for settings form
const settingsFormSchema = z.object({
  defaultPayPeriod: z.string().min(1, "Please select a default pay period"),
  autoCalculate: z.boolean().default(false),
  includeUnpaidLeave: z.boolean().default(true),
  includeOvertime: z.boolean().default(true)
});

// Define schema for pay rules form
const payRulesFormSchema = z.object({
  overtimeRate: z.number().min(1, "Overtime rate must be at least 1"),
  weekendRate: z.number().min(1, "Weekend rate must be at least 1"),
  holidayRate: z.number().min(1, "Holiday rate must be at least 1"),
  maxWorkingHoursPerDay: z.number().min(1, "Maximum working hours must be at least 1"),
  defaultBreakTime: z.number().min(0, "Break time cannot be negative")
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;
type PayRulesFormValues = z.infer<typeof payRulesFormSchema>;

export default function PayConfig() {
  const [isLoading, setIsLoading] = useState(false);
  const [payPeriods, setPayPeriods] = useState<{id: string, name: string}[]>([]);
  const [activeTab, setActiveTab] = useState<string>("general");

  // Initialize the settings form
  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      defaultPayPeriod: "",
      autoCalculate: false,
      includeUnpaidLeave: true,
      includeOvertime: true
    }
  });

  // Initialize the pay rules form
  const payRulesForm = useForm<PayRulesFormValues>({
    resolver: zodResolver(payRulesFormSchema),
    defaultValues: {
      overtimeRate: 1.5,
      weekendRate: 1.5,
      holidayRate: 2.0,
      maxWorkingHoursPerDay: 8,
      defaultBreakTime: 60
    }
  });

  // Fetch pay periods and settings on component mount
  useEffect(() => {
    const fetchPayPeriods = async () => {
      try {
        const { data, error } = await supabase
          .from("pay_periods")
          .select("id, name")
          .eq("is_active", true)
          .order("name");
          
        if (error) throw error;
        setPayPeriods(data || []);
      } catch (error) {
        console.error("Error fetching pay periods:", error);
        toast.error("Failed to load pay periods");
      }
    };

    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        // Fetch general settings
        const { data: settingsData, error: settingsError } = await supabase
          .from("pay_settings")
          .select("*")
          .single();
          
        if (settingsError && settingsError.code !== "PGRST116") {
          throw settingsError;
        }
        
        if (settingsData) {
          settingsForm.reset({
            defaultPayPeriod: settingsData.default_pay_period_id || "",
            autoCalculate: settingsData.auto_calculate || false,
            includeUnpaidLeave: settingsData.include_unpaid_leave !== false,
            includeOvertime: settingsData.include_overtime !== false
          });
        }
        
        // Fetch pay rules
        const { data: rulesData, error: rulesError } = await supabase
          .from("pay_rules")
          .select("*")
          .single();
          
        if (rulesError && rulesError.code !== "PGRST116") {
          throw rulesError;
        }
        
        if (rulesData) {
          payRulesForm.reset({
            overtimeRate: rulesData.overtime_rate || 1.5,
            weekendRate: rulesData.weekend_rate || 1.5,
            holidayRate: rulesData.holiday_rate || 2.0,
            maxWorkingHoursPerDay: rulesData.max_working_hours_per_day || 8,
            defaultBreakTime: rulesData.default_break_time || 60
          });
        }
      } catch (error) {
        console.error("Error fetching pay settings:", error);
        toast.error("Failed to load pay settings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayPeriods();
    fetchSettings();
  }, []);

  const onSubmitSettings = async (data: SettingsFormValues) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("pay_settings")
        .upsert({
          id: '1', // Using a fixed ID for the singleton settings row
          default_pay_period_id: data.defaultPayPeriod,
          auto_calculate: data.autoCalculate,
          include_unpaid_leave: data.includeUnpaidLeave,
          include_overtime: data.includeOvertime,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        
      if (error) throw error;
      toast.success("Pay settings updated successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitPayRules = async (data: PayRulesFormValues) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("pay_rules")
        .upsert({
          id: '1', // Using a fixed ID for the singleton rules row
          overtime_rate: data.overtimeRate,
          weekend_rate: data.weekendRate,
          holiday_rate: data.holidayRate,
          max_working_hours_per_day: data.maxWorkingHoursPerDay,
          default_break_time: data.defaultBreakTime,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        
      if (error) throw error;
      toast.success("Pay rules updated successfully");
    } catch (error) {
      console.error("Error saving pay rules:", error);
      toast.error("Failed to save pay rules");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pay Configuration</CardTitle>
        <CardDescription>Configure global pay settings and rules</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General Settings</TabsTrigger>
            <TabsTrigger value="rules">Pay Rules</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Form {...settingsForm}>
              <form onSubmit={settingsForm.handleSubmit(onSubmitSettings)} className="space-y-4">
                <FormField
                  control={settingsForm.control}
                  name="defaultPayPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Pay Period</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select default pay period" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {payPeriods.map(period => (
                            <SelectItem key={period.id} value={period.id}>
                              {period.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the default pay period for new employees
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-4">
                  <FormField
                    control={settingsForm.control}
                    name="autoCalculate"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Auto-calculate Pay</FormLabel>
                          <FormDescription>
                            Automatically calculate pay based on hours worked
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={settingsForm.control}
                    name="includeUnpaidLeave"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Include Unpaid Leave</FormLabel>
                          <FormDescription>
                            Include unpaid leave in salary calculations
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={settingsForm.control}
                    name="includeOvertime"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Include Overtime</FormLabel>
                          <FormDescription>
                            Include overtime hours in salary calculations
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                  Save Settings
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <Form {...payRulesForm}>
              <form onSubmit={payRulesForm.handleSubmit(onSubmitPayRules)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={payRulesForm.control}
                    name="overtimeRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overtime Rate</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            step="0.1"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Multiplier for overtime hours (e.g., 1.5 = 1.5x regular pay)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={payRulesForm.control}
                    name="weekendRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weekend Rate</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            step="0.1"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Multiplier for weekend hours
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={payRulesForm.control}
                    name="holidayRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Holiday Rate</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            step="0.1"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Multiplier for hours worked on holidays
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={payRulesForm.control}
                    name="maxWorkingHoursPerDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Working Hours Per Day</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            step="1"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Hours beyond this count as overtime
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={payRulesForm.control}
                    name="defaultBreakTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Break Time (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="5"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Default break time in minutes per shift
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                  Save Pay Rules
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}