
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { FormDialog } from "@/components/ui/form-dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

type MembershipFormValues = {
  name: string;
  description: string;
  validity_period: number;
  validity_unit: 'days' | 'months';
  applicable_to_all: boolean;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_discount_value: number;
  min_billing_amount: number;
};

export default function Memberships() {
  const [openDialog, setOpenDialog] = React.useState(false);
  const { data: memberships, isLoading, create } = useSupabaseCrud('memberships');
  
  const form = useForm<MembershipFormValues>({
    defaultValues: {
      name: '',
      description: '',
      validity_period: 30,
      validity_unit: 'days',
      applicable_to_all: true,
      discount_type: 'percentage',
      discount_value: 0,
      max_discount_value: 0,
      min_billing_amount: 0
    }
  });

  const onSubmit = async (data: MembershipFormValues) => {
    await create(data);
    setOpenDialog(false);
    form.reset();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Memberships</h1>
          <p className="text-muted-foreground">Create and manage membership plans for your customers</p>
        </div>
        <Button onClick={() => setOpenDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Membership
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <p>Loading memberships...</p>
        </div>
      ) : memberships?.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <h3 className="font-semibold text-lg">No memberships yet</h3>
            <p className="text-muted-foreground mt-2">
              Create your first membership to offer special discounts to your loyal customers.
            </p>
            <Button className="mt-4" onClick={() => setOpenDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Membership
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memberships?.map((membership) => (
            <Card key={membership.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>{membership.name}</CardTitle>
                <CardDescription>
                  {membership.validity_period} {membership.validity_unit}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {membership.description}
                </p>
                <div className="mt-4 space-y-2">
                  <div className="text-sm flex justify-between">
                    <span>Discount:</span>
                    <span className="font-medium">
                      {membership.discount_type === 'percentage' ? `${membership.discount_value}%` : `₹${membership.discount_value}`}
                    </span>
                  </div>
                  <div className="text-sm flex justify-between">
                    <span>Max discount:</span>
                    <span className="font-medium">{membership.max_discount_value > 0 ? `₹${membership.max_discount_value}` : 'No limit'}</span>
                  </div>
                  <div className="text-sm flex justify-between">
                    <span>Min. billing:</span>
                    <span className="font-medium">{membership.min_billing_amount > 0 ? `₹${membership.min_billing_amount}` : 'No minimum'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FormDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        title="Create Membership"
        description="Define your membership plan details"
        form={form}
        onSubmit={form.handleSubmit(onSubmit)}
        submitLabel="Create Membership"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Membership Name</FormLabel>
              <FormControl>
                <Input placeholder="Premium Membership" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe membership benefits" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex space-x-4">
          <FormField
            control={form.control}
            name="validity_period"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Validity Period</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="validity_unit"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Unit</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a unit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator className="my-4" />
        
        <FormField
          control={form.control}
          name="applicable_to_all"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Apply to all services & packages</FormLabel>
                <FormDescription>
                  Turn off to select specific services or packages
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

        <Separator className="my-4" />

        <div className="space-y-4">
          <h3 className="text-md font-medium">Discount Settings</h3>
          
          <FormField
            control={form.control}
            name="discount_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select discount type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discount_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Value</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min={0} 
                    step={form.watch('discount_type') === 'percentage' ? '0.1' : '1'} 
                    {...field} 
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="max_discount_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Discount Value (₹)</FormLabel>
                <FormDescription>
                  Set 0 for no maximum limit
                </FormDescription>
                <FormControl>
                  <Input 
                    type="number" 
                    min={0} 
                    {...field} 
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="min_billing_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Billing Amount (₹)</FormLabel>
                <FormDescription>
                  Minimum purchase amount required for discount to apply
                </FormDescription>
                <FormControl>
                  <Input 
                    type="number" 
                    min={0} 
                    {...field} 
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormDialog>
    </div>
  );
}
