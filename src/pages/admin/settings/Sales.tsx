import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Award,
  Check,
  Coins,
  DollarSign,
  Gift,
  Info,
  PercentIcon,
  Plus,
  Pencil,
  Save,
  Star,
  Trash,
  X,
  ChevronLeft,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useCoupons, type Coupon } from "@/hooks/use-coupons";
import { useTaxRates, type TaxRate } from "@/hooks/use-tax-rates";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { supabase } from "@/integrations/supabase/client";
import {
  usePaymentMethods,
  type PaymentMethod,
} from "@/hooks/use-payment-methods";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
// Components for different sections
import LoyaltyProgram from "./LoyaltyProgram";
import Memberships from "./Memberships";

const taxRateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  percentage: z.coerce.number().min(0, "Percentage must be a positive number"),
  is_default: z.boolean().optional(),
});

const paymentMethodFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  is_enabled: z.boolean().default(true),
  is_default: z.boolean().optional(),
});

const couponFormSchema = z.object({
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.coerce.number().min(0, "Value must be a positive number"),
  apply_to_all: z.boolean().default(true),
});

// Gift Cards placeholder component
const GiftCards = () => (
  <div className="container py-6">
    <h1 className="text-2xl font-bold mb-6">Gift Cards</h1>
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-12">
          <Gift className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">Gift Cards Coming Soon</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Gift card management will be available in a future update. Stay
            tuned for this exciting feature!
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default function Sales() {
  const {
    taxRates,
    isLoading: isTaxRatesLoading,
    fetchTaxRates,
    createTaxRate,
    updateTaxRate,
    deleteTaxRate,
  } = useTaxRates();
  const [openTaxDialog, setOpenTaxDialog] = useState(false);
  const [editingTaxRate, setEditingTaxRate] = useState<TaxRate | null>(null);

  const {
    paymentMethods,
    isLoading: isPaymentMethodsLoading,
    fetchPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
  } = usePaymentMethods();
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] =
    useState<PaymentMethod | null>(null);

  const {
    coupons,
    isLoading: isCouponsLoading,
    fetchCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    getCouponServices,
    saveCouponServices,
  } = useCoupons();
  const [openCouponDialog, setOpenCouponDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showCouponServicesDialog, setShowCouponServicesDialog] =
    useState(false);

  // State to control which section is shown
  const [activeTab, setActiveTab] = useState("tax-rates");

  useEffect(() => {
    fetchTaxRates();
    fetchPaymentMethods();
    fetchCoupons();
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data } = await supabase
      .from("services")
      .select("id, name, selling_price")
      .order("name");
    if (data) {
      setServices(data);
    }
  };

  const taxForm = useForm<z.infer<typeof taxRateFormSchema>>({
    resolver: zodResolver(taxRateFormSchema),
    defaultValues: {
      name: "",
      percentage: 0,
      is_default: false,
    },
  });

  const handleOpenTaxDialog = (taxRate?: TaxRate) => {
    if (taxRate) {
      setEditingTaxRate(taxRate);
      taxForm.reset({
        name: taxRate.name,
        percentage: taxRate.percentage,
        is_default: taxRate.is_default,
      });
    } else {
      setEditingTaxRate(null);
      taxForm.reset({
        name: "",
        percentage: 0,
        is_default: false,
      });
    }
    setOpenTaxDialog(true);
  };

  const onTaxSubmit = async (values: z.infer<typeof taxRateFormSchema>) => {
    try {
      if (editingTaxRate) {
        await updateTaxRate(editingTaxRate.id, values as Omit<TaxRate, "id">);
      } else {
        await createTaxRate(values as Omit<TaxRate, "id">);
      }
      setOpenTaxDialog(false);
    } catch (error) {
      console.error("Error saving tax rate:", error);
    }
  };

  const handleDeleteTaxRate = async (id: string) => {
    if (confirm("Are you sure you want to delete this tax rate?")) {
      try {
        await deleteTaxRate(id);
        toast.success("Tax rate deleted successfully");
      } catch (error) {
        console.error("Error deleting tax rate:", error);
        toast.error("Failed to delete tax rate");
      }
    }
  };

  const paymentForm = useForm<z.infer<typeof paymentMethodFormSchema>>({
    resolver: zodResolver(paymentMethodFormSchema),
    defaultValues: {
      name: "",
      is_enabled: true,
      is_default: false,
    },
  });

  const handleOpenPaymentDialog = (paymentMethod?: PaymentMethod) => {
    if (paymentMethod) {
      setEditingPaymentMethod(paymentMethod);
      paymentForm.reset({
        name: paymentMethod.name,
        is_enabled: paymentMethod.is_enabled,
        is_default: paymentMethod.is_default,
      });
    } else {
      setEditingPaymentMethod(null);
      paymentForm.reset({
        name: "",
        is_enabled: true,
        is_default: false,
      });
    }
    setOpenPaymentDialog(true);
  };

  const onPaymentSubmit = async (
    values: z.infer<typeof paymentMethodFormSchema>
  ) => {
    try {
      const paymentMethodData: Omit<PaymentMethod, "id"> = {
        name: values.name,
        is_enabled: values.is_enabled,
        is_default: values.is_default,
      };

      if (editingPaymentMethod) {
        await updatePaymentMethod(editingPaymentMethod.id, paymentMethodData);
      } else {
        await createPaymentMethod(paymentMethodData);
      }
      setOpenPaymentDialog(false);
    } catch (error) {
      console.error("Error saving payment method:", error);
    }
  };

  const handleTogglePaymentMethod = async (id: string, isEnabled: boolean) => {
    try {
      await updatePaymentMethod(id, { is_enabled: !isEnabled });
    } catch (error) {
      console.error("Error toggling payment method:", error);
    }
  };

  const couponForm = useForm<z.infer<typeof couponFormSchema>>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: 0,
      apply_to_all: true,
    },
  });

  const handleOpenCouponDialog = async (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      const couponServices = await getCouponServices(coupon.id);
      setSelectedServices(couponServices.map((cs) => cs.service_id));

      couponForm.reset({
        code: coupon.code,
        description: coupon.description || "",
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        apply_to_all: coupon.apply_to_all,
      });
    } else {
      setEditingCoupon(null);
      setSelectedServices([]);
      couponForm.reset({
        code: "",
        description: "",
        discount_type: "percentage",
        discount_value: 0,
        apply_to_all: true,
      });
    }
    setOpenCouponDialog(true);
  };

  const onCouponSubmit = async (values: z.infer<typeof couponFormSchema>) => {
    try {
      let couponId;

      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, values as Omit<Coupon, "id">);
        couponId = editingCoupon.id;
      } else {
        const newCoupon = await createCoupon(values as Omit<Coupon, "id">);
        couponId = newCoupon.id;
      }

      if (!values.apply_to_all) {
        await saveCouponServices(couponId, selectedServices);
      }

      setOpenCouponDialog(false);
    } catch (error) {
      console.error("Error saving coupon:", error);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (confirm("Are you sure you want to delete this coupon?")) {
      try {
        await deleteCoupon(id);
        toast.success("Coupon deleted successfully");
      } catch (error) {
        console.error("Error deleting coupon:", error);
        toast.error("Failed to delete coupon");
      }
    }
  };

  const handleServiceSelection = async (serviceId: string) => {
    setSelectedServices((current) => {
      const isSelected = current.includes(serviceId);
      if (isSelected) {
        return current.filter((id) => id !== serviceId);
      } else {
        return [...current, serviceId];
      }
    });
  };

  // Content components for each tab
  const renderContent = () => {
    switch (activeTab) {
      case "tax-rates":
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold tracking-tight">Tax Rates</h2>
              <Dialog open={openTaxDialog} onOpenChange={setOpenTaxDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tax Rate
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTaxRate ? "Edit Tax Rate" : "Create Tax Rate"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingTaxRate
                        ? "Update an existing tax rate."
                        : "Add a new tax rate to your business."}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...taxForm}>
                    <form
                      onSubmit={taxForm.handleSubmit(onTaxSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={taxForm.control}
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
                        control={taxForm.control}
                        name="percentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Percentage</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0.00"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={taxForm.control}
                        name="is_default"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm">
                                Set as Default
                              </FormLabel>
                              <FormDescription>
                                This tax rate will be automatically applied to
                                all new services and products.
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
            {isTaxRatesLoading ? (
              <p>Loading tax rates...</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Name</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxRates?.map((taxRate) => (
                      <TableRow key={taxRate.id}>
                        <TableCell className="font-medium">
                          {taxRate.name}
                        </TableCell>
                        <TableCell>{taxRate.percentage}%</TableCell>
                        <TableCell>
                          {taxRate.is_default ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenTaxDialog(taxRate)}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteTaxRate(taxRate.id)}
                            >
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
          </div>
        );

      case "payment-methods":
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold tracking-tight">
                Payment Methods
              </h2>
              <Dialog
                open={openPaymentDialog}
                onOpenChange={setOpenPaymentDialog}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Payment Method
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPaymentMethod
                        ? "Edit Payment Method"
                        : "Create Payment Method"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingPaymentMethod
                        ? "Update an existing payment method."
                        : "Add a new payment method to your business."}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...paymentForm}>
                    <form
                      onSubmit={paymentForm.handleSubmit(onPaymentSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={paymentForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Payment Method Name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={paymentForm.control}
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
                        control={paymentForm.control}
                        name="is_default"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm">
                                Set as Default
                              </FormLabel>
                              <FormDescription>
                                This payment method will be automatically
                                selected for new bookings.
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
            {isPaymentMethodsLoading ? (
              <p>Loading payment methods...</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Name</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethods?.map((paymentMethod) => (
                      <TableRow key={paymentMethod.id}>
                        <TableCell className="font-medium">
                          {paymentMethod.name}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={paymentMethod.is_enabled}
                            onCheckedChange={() =>
                              handleTogglePaymentMethod(
                                paymentMethod.id,
                                paymentMethod.is_enabled
                              )
                            }
                            disabled={paymentMethod.is_system}
                          />
                        </TableCell>
                        <TableCell>
                          {paymentMethod.is_default ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleOpenPaymentDialog(paymentMethod)
                              }
                              disabled={paymentMethod.is_system}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                          </div>
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
          </div>
        );

      case "coupons":
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold tracking-tight">Coupons</h2>
              <Dialog
                open={openCouponDialog}
                onOpenChange={setOpenCouponDialog}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Coupon
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCoupon ? "Edit Coupon" : "Create Coupon"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingCoupon
                        ? "Update an existing coupon."
                        : "Create a new coupon for your customers."}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...couponForm}>
                    <form
                      onSubmit={couponForm.handleSubmit(onCouponSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={couponForm.control}
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
                        control={couponForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Coupon Description"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={couponForm.control}
                        name="discount_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select discount type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percentage">
                                  Percentage{" "}
                                  <PercentIcon className="w-4 h-4 ml-2" />
                                </SelectItem>
                                <SelectItem value="fixed">
                                  Fixed <DollarSign className="w-4 h-4 ml-2" />
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={couponForm.control}
                        name="discount_value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount Value</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0.00"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={couponForm.control}
                        name="apply_to_all"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm">
                                Apply to All Services
                              </FormLabel>
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
                      {!couponForm.watch("apply_to_all") && (
                        <FormItem>
                          <FormLabel>Select Services</FormLabel>
                          <FormControl>
                            <Dialog
                              open={showCouponServicesDialog}
                              onOpenChange={setShowCouponServicesDialog}
                            >
                              <DialogTrigger asChild>
                                <Button variant="outline" type="button">
                                  Select Services ({selectedServices.length})
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Select Services</DialogTitle>
                                  <DialogDescription>
                                    Choose the services to which this coupon
                                    will apply.
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
                                          checked={selectedServices.includes(
                                            service.id
                                          )}
                                          onCheckedChange={() =>
                                            handleServiceSelection(service.id)
                                          }
                                        />
                                        <span>{service.name}</span>
                                        <Badge variant="secondary">
                                          ₹{service.selling_price}
                                        </Badge>
                                      </label>
                                    </div>
                                  ))}
                                </ScrollArea>
                                <DialogFooter>
                                  <Button
                                    onClick={() =>
                                      setShowCouponServicesDialog(false)
                                    }
                                  >
                                    Close
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
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
            {isCouponsLoading ? (
              <p>Loading coupons...</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Applies To</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons?.map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-medium">
                          {coupon.code}
                        </TableCell>
                        <TableCell>{coupon.description}</TableCell>
                        <TableCell>
                          {coupon.discount_type === "percentage"
                            ? `${coupon.discount_value}%`
                            : `₹${coupon.discount_value}`}
                        </TableCell>
                        <TableCell>
                          {coupon.apply_to_all
                            ? "All Services"
                            : "Selected Services"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCouponDialog(coupon)}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteCoupon(coupon.id)}
                            >
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
          </div>
        );

      case "memberships":
        return <Memberships />;

      case "loyalty-program":
        return <LoyaltyProgram />;

      case "gift-cards":
        return <GiftCards />;

      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <div className="container py-6">
      <div className="flex items-center mb-6">
            {" "}
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
        <div className="flex space-x-6">
          
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Sales Settings</h2>
            <nav className="space-y-2">
              <Button
                variant={activeTab === "tax-rates" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("tax-rates")}
              >
                <PercentIcon className="mr-2 h-4 w-4" />
                Tax Rates
              </Button>
              <Button
                variant={activeTab === "payment-methods" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("payment-methods")}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Payment Methods
              </Button>
              <Button
                variant={activeTab === "coupons" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("coupons")}
              >
                <Coins className="mr-2 h-4 w-4" />
                Coupons
              </Button>
              <Button
                variant={activeTab === "memberships" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("memberships")}
              >
                <Award className="mr-2 h-4 w-4" />
                Memberships
              </Button>
              <Button
                variant={activeTab === "loyalty-program" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("loyalty-program")}
              >
                <Star className="mr-2 h-4 w-4" />
                Loyalty Program
              </Button>
              <Button
                variant={activeTab === "gift-cards" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("gift-cards")}
              >
                <Gift className="mr-2 h-4 w-4" />
                Gift Cards
              </Button>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">{renderContent()}</div>
        </div>
      </div>
    </TooltipProvider>
  );
}
