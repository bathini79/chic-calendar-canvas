
import React, { useState, useEffect } from "react";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ArrowRight, Plus, Trash2, CreditCard, Percent, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

// Tax rate form schema
const taxRateSchema = z.object({
  name: z.string().min(1, "Tax name is required"),
  percentage: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Percentage must be a positive number",
  }),
});

// Payment method form schema
const paymentMethodSchema = z.object({
  name: z.string().min(1, "Payment method name is required"),
  is_enabled: z.boolean().default(true),
});

// Coupon form schema
const couponSchema = z.object({
  code: z.string().min(1, "Coupon code is required"),
  description: z.string().optional(),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Discount value must be a positive number",
  }),
  apply_to_all: z.boolean().default(true),
});

// Component for Tax Rates section
const TaxRatesSection = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<any>(null);
  const { data: taxRates = [], isLoading, create, update, remove } = useSupabaseCrud("tax_rates");

  const form = useForm<z.infer<typeof taxRateSchema>>({
    resolver: zodResolver(taxRateSchema),
    defaultValues: {
      name: "",
      percentage: "",
    },
  });

  const resetForm = () => {
    form.reset({
      name: "",
      percentage: "",
    });
    setEditingTax(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (tax: any) => {
    setEditingTax(tax);
    form.reset({
      name: tax.name,
      percentage: tax.percentage.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDeleteTax = async (id: string) => {
    try {
      await remove(id);
      toast.success("Tax rate deleted");
    } catch (error) {
      toast.error("Failed to delete tax rate");
    }
  };

  const onSubmit = async (values: z.infer<typeof taxRateSchema>) => {
    try {
      const taxData = {
        name: values.name,
        percentage: parseFloat(values.percentage),
      };

      if (editingTax) {
        await update(editingTax.id, taxData);
        toast.success("Tax rate updated");
      } else {
        await create(taxData);
        toast.success("Tax rate added");
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to save tax rate");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Tax Rates</CardTitle>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Tax
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Set up tax rates for services and products.
        </p>

        {isLoading ? (
          <div className="flex justify-center p-4">Loading tax rates...</div>
        ) : taxRates.length === 0 ? (
          <div className="mt-4 p-8 border rounded-lg border-dashed text-center text-muted-foreground">
            No tax rates configured yet. Add your first tax rate to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {taxRates.map((tax: any) => (
              <div 
                key={tax.id} 
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-medium">{tax.name}</h3>
                  <p className="text-sm text-muted-foreground">{tax.percentage}%</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(tax)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteTax(tax.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingTax ? "Edit tax rate" : "Add new tax"}</DialogTitle>
              <DialogDescription>
                Set the tax name and percentage rate. To apply this to your products and
                services, adjust your tax defaults settings.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., GST, VAT" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax rate (%)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="e.g., 18"
                            {...field}
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            %
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

// Component for Payment Methods section
const PaymentMethodsSection = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any>(null);
  const { data: paymentMethods = [], isLoading, create, update, remove } = useSupabaseCrud("payment_methods");

  const form = useForm<z.infer<typeof paymentMethodSchema>>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      name: "",
      is_enabled: true,
    },
  });

  const resetForm = () => {
    form.reset({
      name: "",
      is_enabled: true,
    });
    setEditingMethod(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (method: any) => {
    setEditingMethod(method);
    form.reset({
      name: method.name,
      is_enabled: method.is_enabled,
    });
    setIsDialogOpen(true);
  };

  const togglePaymentMethod = async (id: string, isEnabled: boolean) => {
    try {
      await update(id, { is_enabled: !isEnabled });
      toast.success(`Payment method ${isEnabled ? 'disabled' : 'enabled'}`);
    } catch (error) {
      toast.error("Failed to update payment method");
    }
  };

  const handleDeleteMethod = async (id: string) => {
    try {
      await remove(id);
      toast.success("Payment method deleted");
    } catch (error) {
      toast.error("Failed to delete payment method");
    }
  };

  const onSubmit = async (values: z.infer<typeof paymentMethodSchema>) => {
    try {
      if (editingMethod) {
        await update(editingMethod.id, values);
        toast.success("Payment method updated");
      } else {
        await create(values);
        toast.success("Payment method added");
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to save payment method");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Payment Methods</CardTitle>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Payment Method
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Configure the payment methods your business accepts from customers.
        </p>

        {isLoading ? (
          <div className="flex justify-center p-4">Loading payment methods...</div>
        ) : paymentMethods.length === 0 ? (
          <div className="mt-4 p-8 border rounded-lg border-dashed text-center text-muted-foreground">
            No payment methods configured yet. Add your first payment method to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((method: any) => (
              <div 
                key={method.id} 
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">{method.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {method.is_enabled ? 'Enabled' : 'Disabled'}
                      {method.is_system && ' • System default'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={method.is_enabled} 
                    onCheckedChange={() => togglePaymentMethod(method.id, method.is_enabled)}
                    disabled={method.is_system && method.is_default}
                  />
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(method)} disabled={method.is_system}>
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDeleteMethod(method.id)}
                    disabled={method.is_system}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingMethod ? "Edit payment method" : "Add payment method"}</DialogTitle>
              <DialogDescription>
                Configure the payment methods your business accepts from customers.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment method name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Credit Card, PayPal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Enabled</FormLabel>
                        <FormDescription>
                          Allow customers to use this payment method
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
                <DialogFooter className="pt-4">
                  <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

// Component for Coupons section
const CouponsSection = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [serviceSheet, setServiceSheet] = useState(false);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const { data: coupons = [], isLoading, create, update, remove } = useSupabaseCrud("coupons");
  
  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("id, name");
    if (data) {
      setAllServices(data);
    }
  };

  const fetchCouponServices = async (couponId: string) => {
    const { data } = await supabase
      .from("coupon_services")
      .select("service_id")
      .eq("coupon_id", couponId);
    
    if (data) {
      const serviceIds = data.map(item => item.service_id);
      const services = allServices.filter(service => serviceIds.includes(service.id));
      setSelectedServices(services);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const form = useForm<z.infer<typeof couponSchema>>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      apply_to_all: true,
    },
  });

  const resetForm = () => {
    form.reset({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      apply_to_all: true,
    });
    setSelectedServices([]);
    setEditingCoupon(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = async (coupon: any) => {
    setEditingCoupon(coupon);
    form.reset({
      code: coupon.code,
      description: coupon.description || "",
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      apply_to_all: coupon.apply_to_all,
    });
    
    if (!coupon.apply_to_all) {
      await fetchCouponServices(coupon.id);
    }
    
    setIsDialogOpen(true);
  };

  const handleDeleteCoupon = async (id: string) => {
    try {
      await remove(id);
      toast.success("Coupon deleted");
    } catch (error) {
      toast.error("Failed to delete coupon");
    }
  };

  const toggleServiceSelection = (service: any) => {
    setSelectedServices(prev => {
      if (prev.some(s => s.id === service.id)) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  const openServiceSelection = () => {
    setServiceSheet(true);
  };

  const closeServiceSelection = () => {
    setServiceSheet(false);
  };

  const saveCouponServices = async (couponId: string) => {
    // Delete existing relationships
    await supabase
      .from("coupon_services")
      .delete()
      .eq("coupon_id", couponId);
    
    // Insert new relationships
    if (selectedServices.length > 0) {
      const relationships = selectedServices.map(service => ({
        coupon_id: couponId,
        service_id: service.id,
      }));
      
      await supabase
        .from("coupon_services")
        .insert(relationships);
    }
  };

  const onSubmit = async (values: z.infer<typeof couponSchema>) => {
    try {
      const couponData = {
        code: values.code,
        description: values.description || null,
        discount_type: values.discount_type,
        discount_value: parseFloat(values.discount_value),
        apply_to_all: values.apply_to_all,
      };

      let couponId;
      
      if (editingCoupon) {
        await update(editingCoupon.id, couponData);
        couponId = editingCoupon.id;
        toast.success("Coupon updated");
      } else {
        const newCoupon = await create(couponData);
        couponId = newCoupon.id;
        toast.success("Coupon added");
      }
      
      if (!values.apply_to_all) {
        await saveCouponServices(couponId);
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to save coupon");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Coupons</CardTitle>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Coupon
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Create and manage discount coupons for your customers.
        </p>

        {isLoading ? (
          <div className="flex justify-center p-4">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="mt-4 p-8 border rounded-lg border-dashed text-center text-muted-foreground">
            No coupons created yet. Add your first coupon to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {coupons.map((coupon: any) => (
              <div 
                key={coupon.id} 
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">{coupon.code}</h3>
                    <p className="text-xs text-muted-foreground">
                      {coupon.discount_type === 'percentage' ? 
                        `${coupon.discount_value}% off` : 
                        `₹${coupon.discount_value} off`}
                      {coupon.description && ` • ${coupon.description}`}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(coupon)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteCoupon(coupon.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? "Edit coupon" : "Add new coupon"}</DialogTitle>
              <DialogDescription>
                Create discount coupons for your customers. Coupons can be applied to specific services or all services.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., SUMMER20" {...field} />
                      </FormControl>
                      <FormDescription>
                        Customers will enter this code to apply the discount.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Summer promotion" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discount_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount type</FormLabel>
                        <FormControl>
                          <select 
                            className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                            {...field}
                          >
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed amount (₹)</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="discount_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount value</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              step={form.watch("discount_type") === "percentage" ? "1" : "0.01"}
                              placeholder={form.watch("discount_type") === "percentage" ? "e.g., 20" : "e.g., 100"}
                              {...field}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              {form.watch("discount_type") === "percentage" ? "%" : "₹"}
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="apply_to_all"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Apply discount to</FormLabel>
                        <FormDescription>
                          Choose which services this coupon applies to
                        </FormDescription>
                      </div>
                      <FormControl>
                        <select 
                          className="flex h-9 w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium"
                          value={field.value ? "all" : "custom"}
                          onChange={(e) => field.onChange(e.target.value === "all")}
                        >
                          <option value="all">All services</option>
                          <option value="custom">Selected services</option>
                        </select>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {!form.watch("apply_to_all") && (
                  <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Selected services</FormLabel>
                      <FormDescription>
                        {selectedServices.length === 0 
                          ? "No services selected" 
                          : `${selectedServices.length} service${selectedServices.length === 1 ? "" : "s"} selected`}
                      </FormDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={openServiceSelection}
                    >
                      Select Services
                    </Button>
                  </div>
                )}

                <DialogFooter className="pt-4">
                  <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Sheet open={serviceSheet} onOpenChange={setServiceSheet}>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Select Services</SheetTitle>
              <SheetDescription>
                Choose which services this coupon can be applied to.
              </SheetDescription>
            </SheetHeader>
            <div className="py-6">
              <div className="space-y-4">
                {allServices.map(service => (
                  <div 
                    key={service.id} 
                    className="flex items-center space-x-2"
                  >
                    <Checkbox 
                      id={`service-${service.id}`}
                      checked={selectedServices.some(s => s.id === service.id)}
                      onCheckedChange={() => toggleServiceSelection(service)}
                    />
                    <label
                      htmlFor={`service-${service.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {service.name}
                    </label>
                  </div>
                ))}

                {allServices.length === 0 && (
                  <div className="text-center text-muted-foreground">
                    No services available
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={closeServiceSelection}>
                Cancel
              </Button>
              <Button onClick={closeServiceSelection}>
                Done
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
};

// Placeholder components for loyalty and memberships sections
const LoyaltyProgramSection = () => (
  <Card>
    <CardHeader>
      <CardTitle>Loyalty Program</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">
        Configure your customer loyalty program to reward repeat customers.
      </p>
      <div className="mt-4 p-8 border rounded-lg border-dashed text-center text-muted-foreground">
        Loyalty program not configured yet. Set up your loyalty program to get started.
      </div>
    </CardContent>
  </Card>
);

const MembershipsSection = () => (
  <Card>
    <CardHeader>
      <CardTitle>Memberships</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">
        Create and manage membership plans for your customers.
      </p>
      <div className="mt-4 p-8 border rounded-lg border-dashed text-center text-muted-foreground">
        No membership plans created yet. Add your first membership plan to get started.
      </div>
    </CardContent>
  </Card>
);

export default function Sales() {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<string>(
    location.pathname.includes('payment-methods') ? "payment-methods" :
    location.pathname.includes('tax-rates') ? "tax-rates" :
    location.pathname.includes('coupons') ? "coupons" :
    location.pathname.includes('loyalty-program') ? "loyalty-program" :
    location.pathname.includes('memberships') ? "memberships" : "payment-methods"
  );

  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <Link to="/admin/settings">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <div className="text-sm text-muted-foreground">
          Workspace settings • Sales
        </div>
      </div>

      <Routes>
        <Route path="/" element={
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sales</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div 
                    className={`px-4 py-2 cursor-pointer ${activeSection === "payment-methods" ? "bg-accent" : ""}`}
                    onClick={() => setActiveSection("payment-methods")}
                  >
                    <span>Payment methods</span>
                  </div>
                  <div 
                    className={`px-4 py-2 cursor-pointer ${activeSection === "tax-rates" ? "bg-accent" : ""}`}
                    onClick={() => setActiveSection("tax-rates")}
                  >
                    <span>Tax rates</span>
                  </div>
                  <div 
                    className={`px-4 py-2 cursor-pointer ${activeSection === "coupons" ? "bg-accent" : ""}`}
                    onClick={() => setActiveSection("coupons")}
                  >
                    <span>Coupons</span>
                  </div>
                  <div 
                    className={`px-4 py-2 cursor-pointer ${activeSection === "loyalty-program" ? "bg-accent" : ""}`}
                    onClick={() => setActiveSection("loyalty-program")}
                  >
                    <span>Loyalty program</span>
                  </div>
                  <div 
                    className={`px-4 py-2 cursor-pointer ${activeSection === "memberships" ? "bg-accent" : ""}`}
                    onClick={() => setActiveSection("memberships")}
                  >
                    <span>Memberships</span>
                  </div>

                  <Separator className="my-4" />
                  <div className="px-4 py-2 font-medium">Shortcuts</div>

                  <div className="px-4 py-2 flex justify-between items-center cursor-pointer">
                    <span>Invoices</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                  <div className="px-4 py-2 flex justify-between items-center cursor-pointer">
                    <span>Receipts</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                  <div className="px-4 py-2 flex justify-between items-center cursor-pointer">
                    <span>Gift cards</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-3">
              {activeSection === "payment-methods" && <PaymentMethodsSection />}
              {activeSection === "tax-rates" && <TaxRatesSection />}
              {activeSection === "coupons" && <CouponsSection />}
              {activeSection === "loyalty-program" && <LoyaltyProgramSection />}
              {activeSection === "memberships" && <MembershipsSection />}
            </div>
          </div>
        } />
      </Routes>
    </div>
  );
}
