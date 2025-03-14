
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ArrowRight, Plus, Trash, Pencil, X, Check, PercentIcon, DollarSign } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Memberships from "./Memberships";
import LoyaltyProgram from "./LoyaltyProgram";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTaxRates, type TaxRate } from "@/hooks/use-tax-rates";
import { usePaymentMethods, type PaymentMethod } from "@/hooks/use-payment-methods";
import { useCoupons, type Coupon } from "@/hooks/use-coupons";
import { supabase } from "@/integrations/supabase/client";

// Tax rate form schema
const taxRateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  percentage: z.coerce.number().min(0, "Percentage must be a positive number"),
  is_default: z.boolean().optional(),
});

// Payment method form schema
const paymentMethodFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  is_enabled: z.boolean().default(true),
  is_default: z.boolean().optional(),
});

// Coupon form schema
const couponFormSchema = z.object({
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.coerce.number().min(0, "Value must be a positive number"),
  apply_to_all: z.boolean().default(true),
});

// Components for each section
const PaymentMethods = () => {
  const { paymentMethods, isLoading, fetchPaymentMethods, createPaymentMethod, updatePaymentMethod } = usePaymentMethods();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const form = useForm<z.infer<typeof paymentMethodFormSchema>>({
    resolver: zodResolver(paymentMethodFormSchema),
    defaultValues: {
      name: "",
      is_enabled: true,
      is_default: false,
    },
  });

  const handleOpenDialog = (paymentMethod?: PaymentMethod) => {
    if (paymentMethod) {
      setEditingPaymentMethod(paymentMethod);
      form.reset({
        name: paymentMethod.name,
        is_enabled: paymentMethod.is_enabled,
        is_default: paymentMethod.is_default,
      });
    } else {
      setEditingPaymentMethod(null);
      form.reset({
        name: "",
        is_enabled: true,
        is_default: false,
      });
    }
    setOpenDialog(true);
  };

  const onSubmit = async (values: z.infer<typeof paymentMethodFormSchema>) => {
    try {
      const paymentMethodData = {
        name: values.name,
        is_enabled: values.is_enabled,
        is_default: values.is_default,
      };
      
      if (editingPaymentMethod) {
        await updatePaymentMethod(editingPaymentMethod.id, paymentMethodData);
        toast.success("Payment method updated successfully");
      } else {
        await createPaymentMethod(paymentMethodData);
        toast.success("Payment method created successfully");
      }
      setOpenDialog(false);
    } catch (error: any) {
      console.error("Error saving payment method:", error);
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleTogglePaymentMethod = async (id: string, isEnabled: boolean) => {
    try {
      await updatePaymentMethod(id, { is_enabled: !isEnabled });
      toast.success("Payment method status updated");
    } catch (error: any) {
      console.error("Error toggling payment method:", error);
      toast.error(`Error: ${error.message}`);
    }
  };

  return (
    <div className="bg-muted/50 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Payment Methods</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Payment Method
        </Button>
      </div>
      
      {isLoading ? (
        <p>Loading payment methods...</p>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Default</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentMethods?.map((paymentMethod) => (
                <TableRow key={paymentMethod.id}>
                  <TableCell className="font-medium">{paymentMethod.name}</TableCell>
                  <TableCell>
                    <Switch
                      checked={paymentMethod.is_enabled}
                      onCheckedChange={() => handleTogglePaymentMethod(paymentMethod.id, paymentMethod.is_enabled)}
                      disabled={paymentMethod.is_system}
                    />
                  </TableCell>
                  <TableCell>{paymentMethod.is_default ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(paymentMethod)} disabled={paymentMethod.is_system}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {paymentMethods?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No payment methods found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingPaymentMethod ? "Edit Payment Method" : "Create Payment Method"}</DialogTitle>
            <DialogDescription>
              {editingPaymentMethod ? "Update an existing payment method." : "Add a new payment method to your business."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Payment Method Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Enabled</FormLabel>
                      <FormDescription>
                        Enable or disable this payment method.
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
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Set as Default</FormLabel>
                      <FormDescription>
                        This payment method will be automatically selected for new bookings.
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
              <DialogFooter>
                <Button type="submit">
                  {editingPaymentMethod ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const TaxRates = () => {
  const { taxRates, isLoading, fetchTaxRates, createTaxRate, updateTaxRate, deleteTaxRate } = useTaxRates();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTaxRate, setEditingTaxRate] = useState<TaxRate | null>(null);

  useEffect(() => {
    fetchTaxRates();
  }, []);

  const form = useForm<z.infer<typeof taxRateFormSchema>>({
    resolver: zodResolver(taxRateFormSchema),
    defaultValues: {
      name: "",
      percentage: 0,
      is_default: false,
    },
  });

  const handleOpenDialog = (taxRate?: TaxRate) => {
    if (taxRate) {
      setEditingTaxRate(taxRate);
      form.reset({
        name: taxRate.name,
        percentage: taxRate.percentage,
        is_default: taxRate.is_default,
      });
    } else {
      setEditingTaxRate(null);
      form.reset({
        name: "",
        percentage: 0,
        is_default: false,
      });
    }
    setOpenDialog(true);
  };

  const onSubmit = async (values: z.infer<typeof taxRateFormSchema>) => {
    try {
      if (editingTaxRate) {
        await updateTaxRate(editingTaxRate.id, values as Omit<TaxRate, "id">);
        toast.success("Tax rate updated successfully");
      } else {
        await createTaxRate(values as Omit<TaxRate, "id">);
        toast.success("Tax rate created successfully");
      }
      setOpenDialog(false);
    } catch (error: any) {
      console.error("Error saving tax rate:", error);
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleDeleteTaxRate = async (id: string) => {
    if (confirm("Are you sure you want to delete this tax rate?")) {
      try {
        await deleteTaxRate(id);
        toast.success("Tax rate deleted successfully");
      } catch (error: any) {
        console.error("Error deleting tax rate:", error);
        toast.error(`Error: ${error.message}`);
      }
    }
  };

  return (
    <div className="bg-muted/50 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tax Rates</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Tax Rate
        </Button>
      </div>
      
      {isLoading ? (
        <p>Loading tax rates...</p>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Default</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxRates?.map((taxRate) => (
                <TableRow key={taxRate.id}>
                  <TableCell className="font-medium">{taxRate.name}</TableCell>
                  <TableCell>{taxRate.percentage}%</TableCell>
                  <TableCell>{taxRate.is_default ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(taxRate)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteTaxRate(taxRate.id)}>
                        <Trash className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {taxRates?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No tax rates found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingTaxRate ? "Edit Tax Rate" : "Create Tax Rate"}</DialogTitle>
            <DialogDescription>
              {editingTaxRate ? "Update an existing tax rate." : "Add a new tax rate to your business."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Tax Rate Name" {...field} />
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
                    <FormLabel>Percentage</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Set as Default</FormLabel>
                      <FormDescription>
                        This tax rate will be automatically applied to all new services and products.
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
              <DialogFooter>
                <Button type="submit">
                  {editingTaxRate ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Coupons = () => {
  const { coupons, isLoading, fetchCoupons, createCoupon, updateCoupon, deleteCoupon, getCouponServices, saveCouponServices } = useCoupons();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showServicesDialog, setShowServicesDialog] = useState(false);

  useEffect(() => {
    fetchCoupons();
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("id, name, selling_price").order("name");
    if (data) {
      setServices(data);
    }
  };

  const form = useForm<z.infer<typeof couponFormSchema>>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: 0,
      apply_to_all: true,
    },
  });

  const handleOpenDialog = async (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      const couponServices = await getCouponServices(coupon.id);
      setSelectedServices(couponServices.map(cs => cs.service_id));
      
      form.reset({
        code: coupon.code,
        description: coupon.description || "",
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        apply_to_all: coupon.apply_to_all,
      });
    } else {
      setEditingCoupon(null);
      setSelectedServices([]);
      form.reset({
        code: "",
        description: "",
        discount_type: "percentage",
        discount_value: 0,
        apply_to_all: true,
      });
    }
    setOpenDialog(true);
  };

  const onSubmit = async (values: z.infer<typeof couponFormSchema>) => {
    try {
      let couponId;
      
      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, values as Omit<Coupon, "id">);
        couponId = editingCoupon.id;
        toast.success("Coupon updated successfully");
      } else {
        const newCoupon = await createCoupon(values as Omit<Coupon, "id">);
        couponId = newCoupon.id;
        toast.success("Coupon created successfully");
      }
      
      if (!values.apply_to_all) {
        await saveCouponServices(couponId, selectedServices);
      }
      
      setOpenDialog(false);
    } catch (error: any) {
      console.error("Error saving coupon:", error);
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (confirm("Are you sure you want to delete this coupon?")) {
      try {
        await deleteCoupon(id);
        toast.success("Coupon deleted successfully");
      } catch (error: any) {
        console.error("Error deleting coupon:", error);
        toast.error(`Error: ${error.message}`);
      }
    }
  };

  const handleServiceSelection = async (serviceId: string) => {
    setSelectedServices(current => {
      const isSelected = current.includes(serviceId);
      if (isSelected) {
        return current.filter(id => id !== serviceId);
      } else {
        return [...current, serviceId];
      }
    });
  };

  return (
    <div className="bg-muted/50 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Coupons</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Coupon
        </Button>
      </div>
      
      {isLoading ? (
        <p>Loading coupons...</p>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons?.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-medium">{coupon.code}</TableCell>
                  <TableCell>{coupon.description}</TableCell>
                  <TableCell>
                    {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                  </TableCell>
                  <TableCell>{coupon.apply_to_all ? "All Services" : "Selected Services"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(coupon)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteCoupon(coupon.id)}>
                        <Trash className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {coupons?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No coupons found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
            <DialogDescription>
              {editingCoupon ? "Update an existing coupon." : "Create a new coupon for your customers."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Coupon Code" {...field} />
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
                      <Textarea placeholder="Coupon Description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        <SelectItem value="percentage">Percentage <PercentIcon className="w-4 h-4 ml-2 inline" /></SelectItem>
                        <SelectItem value="fixed">Fixed <DollarSign className="w-4 h-4 ml-2 inline" /></SelectItem>
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
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apply_to_all"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Apply to All Services</FormLabel>
                      <FormDescription>
                        Apply this coupon to all services.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {!form.watch("apply_to_all") && (
                <FormField
                  control={form.control}
                  name="services"
                  render={() => (
                    <FormItem>
                      <FormLabel>Select Services</FormLabel>
                      <FormControl>
                        <Dialog open={showServicesDialog} onOpenChange={setShowServicesDialog}>
                          <DialogTrigger asChild>
                            <Button variant="outline">
                              Select Services ({selectedServices.length} selected)
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Select Services</DialogTitle>
                              <DialogDescription>
                                Choose the services to which this coupon will apply.
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[300px] w-full rounded-md border">
                              {services.map((service) => (
                                <div key={service.id} className="p-2">
                                  <label
                                    htmlFor={`service-${service.id}`}
                                    className="flex items-center space-x-2"
                                  >
                                    <Checkbox
                                      id={`service-${service.id}`}
                                      checked={selectedServices.includes(service.id)}
                                      onCheckedChange={() => handleServiceSelection(service.id)}
                                    />
                                    <span>{service.name}</span>
                                    <Badge variant="secondary">₹{service.selling_price}</Badge>
                                  </label>
                                </div>
                              ))}
                            </ScrollArea>
                            <DialogFooter>
                              <Button onClick={() => setShowServicesDialog(false)}>
                                Done
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter>
                <Button type="submit">
                  {editingCoupon ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Main Sales component
export default function Sales() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract the current section from URL path or default to payment-methods
  const [activeSection, setActiveSection] = useState<string>("payment-methods");
  
  // Update active section whenever location changes
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('memberships')) {
      setActiveSection("memberships");
    } else if (path.includes('loyalty-program')) {
      setActiveSection("loyalty-program");
    } else if (path.includes('payment-methods')) {
      setActiveSection("payment-methods");
    } else if (path.includes('tax-rates')) {
      setActiveSection("tax-rates");
    } else if (path.includes('coupons')) {
      setActiveSection("coupons");
    } else if (path.includes('gift-cards')) {
      setActiveSection("gift-cards");
    }
  }, [location]);

  // Handle section changes
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    // Update URL to reflect the section but stay on the same page
    navigate(`/admin/settings/sales/${section}`, { replace: true });
  };

  // Render the appropriate component based on active section
  const renderContent = () => {
    switch (activeSection) {
      case "memberships":
        return <Memberships />;
      case "loyalty-program":
        return <LoyaltyProgram />;
      case "payment-methods":
        return <PaymentMethods />;
      case "tax-rates":
        return <TaxRates />;
      case "coupons":
        return <Coupons />;
      case "gift-cards":
        return <GiftCards />;
      default:
        return (
          <div className="bg-muted/50 p-6 rounded-lg flex flex-col items-center justify-center min-h-[300px]">
            <p className="text-muted-foreground text-center">
              Select a sales configuration option from the sidebar to get started.
            </p>
          </div>
        );
    }
  };

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
          Workspace settings • Sales configuration
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-0 pt-6">
              <div className="px-4 pb-2">
                <h2 className="text-lg font-medium">Sales configuration</h2>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "payment-methods" ? "bg-accent" : ""}`}
                onClick={() => handleSectionChange("payment-methods")}
              >
                <span>Payment methods</span>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "tax-rates" ? "bg-accent" : ""}`}
                onClick={() => handleSectionChange("tax-rates")}
              >
                <span>Tax rates</span>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "coupons" ? "bg-accent" : ""}`}
                onClick={() => handleSectionChange("coupons")}
              >
                <span>Coupons</span>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "memberships" ? "bg-accent" : ""}`}
                onClick={() => handleSectionChange("memberships")}
              >
                <span>Memberships</span>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "loyalty-program" ? "bg-accent" : ""}`}
                onClick={() => handleSectionChange("loyalty-program")}
              >
                <span>Loyalty program</span>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "gift-cards" ? "bg-accent" : ""}`}
                onClick={() => handleSectionChange("gift-cards")}
              >
                <span>Gift cards</span>
              </div>

              <Separator className="my-4" />
              <div className="px-4 py-2 font-medium">Shortcuts</div>

              <div className="px-4 py-2 flex justify-between items-center cursor-pointer">
                <span>Service menu</span>
                <ArrowRight className="h-4 w-4" />
              </div>
              <div className="px-4 py-2 flex justify-between items-center cursor-pointer">
                <span>Product list</span>
                <ArrowRight className="h-4 w-4" />
              </div>
              <div className="px-4 py-2 flex justify-between items-center cursor-pointer">
                <span>Client list</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
