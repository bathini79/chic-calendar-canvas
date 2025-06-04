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
  Settings,
  Star,
  Trash,
  X,
  ChevronLeft,
  Users,
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
import { useReferralProgram } from "@/hooks/use-referral-program";
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
import DiscountRewardUsage from "./DiscountRewardUsage";

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

// Referral Program schema
const referralProgramFormSchema = z
  .object({
    is_enabled: z.boolean().default(false),

    // Service rewards
    service_reward_type: z.enum(["percentage", "fixed"]).default("percentage"),
    service_percentage: z.coerce
      .number()
      .min(0, "Percentage must be a positive number")
      .max(100, "Percentage must not exceed 100")
      .optional(),
    service_fixed_amount: z.coerce
      .number()
      .min(0, "Amount must be a positive number")
      .optional(),

    // Membership rewards
    membership_reward_type: z
      .enum(["percentage", "fixed"])
      .default("percentage"),
    membership_percentage: z.coerce
      .number()
      .min(0, "Percentage must be a positive number")
      .max(100, "Percentage must not exceed 100")
      .optional(),
    membership_fixed_amount: z.coerce
      .number()
      .min(0, "Amount must be a positive number")
      .optional(),

    // Product rewards
    product_reward_type: z.enum(["percentage", "fixed"]).default("percentage"),
    product_percentage: z.coerce
      .number()
      .min(0, "Percentage must be a positive number")
      .max(100, "Percentage must not exceed 100")
      .optional(),
    product_fixed_amount: z.coerce
      .number()
      .min(0, "Amount must be a positive number")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.service_reward_type === "percentage") {
        return (
          data.service_percentage !== undefined &&
          data.service_percentage !== null
        );
      } else {
        return (
          data.service_fixed_amount !== undefined &&
          data.service_fixed_amount !== null
        );
      }
    },
    {
      message: "Please provide a value for the selected service reward type",
      path: ["service_reward_type"],
    }
  )
  .refine(
    (data) => {
      if (data.membership_reward_type === "percentage") {
        return (
          data.membership_percentage !== undefined &&
          data.membership_percentage !== null
        );
      } else {
        return (
          data.membership_fixed_amount !== undefined &&
          data.membership_fixed_amount !== null
        );
      }
    },
    {
      message: "Please provide a value for the selected membership reward type",
      path: ["membership_reward_type"],
    }
  )
  .refine(
    (data) => {
      if (data.product_reward_type === "percentage") {
        return (
          data.product_percentage !== undefined &&
          data.product_percentage !== null
        );
      } else {
        return (
          data.product_fixed_amount !== undefined &&
          data.product_fixed_amount !== null
        );
      }
    },
    {
      message: "Please provide a value for the selected product reward type",
      path: ["product_reward_type"],
    }
  );

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

// Referral Program component
const ReferralProgram = () => {
  const {
    referralProgram,
    isLoading,
    fetchReferralProgram,
    updateReferralProgram,
  } = useReferralProgram();

  const form = useForm<z.infer<typeof referralProgramFormSchema>>({
    resolver: zodResolver(referralProgramFormSchema),
    defaultValues: {
      is_enabled: false,

      // Default values for services
      service_reward_type: "percentage",
      service_percentage: 5,
      service_fixed_amount: 100,

      // Default values for memberships
      membership_reward_type: "percentage",
      membership_percentage: 10,
      membership_fixed_amount: 200,

      // Default values for products
      product_reward_type: "percentage",
      product_percentage: 3,
      product_fixed_amount: 50,
    },
  });

  useEffect(() => {
    if (referralProgram) {
      form.reset({
        is_enabled: referralProgram.is_enabled,

        // Services
        service_reward_type:
          referralProgram.service_reward_type || "percentage",
        service_percentage: referralProgram.service_percentage || 5,
        service_fixed_amount: referralProgram.service_fixed_amount || 100,

        // Memberships
        membership_reward_type:
          referralProgram.membership_reward_type || "percentage",
        membership_percentage: referralProgram.membership_percentage || 10,
        membership_fixed_amount: referralProgram.membership_fixed_amount || 200,

        // Products
        product_reward_type:
          referralProgram.product_reward_type || "percentage",
        product_percentage: referralProgram.product_percentage || 3,
        product_fixed_amount: referralProgram.product_fixed_amount || 50,
      });
    }
  }, [referralProgram, form]);

  const onSubmit = async (
    values: z.infer<typeof referralProgramFormSchema>
  ) => {
    await updateReferralProgram({
      is_enabled: values.is_enabled,

      // Services rewards
      service_reward_type: values.service_reward_type,
      service_percentage:
        values.service_reward_type === "percentage"
          ? values.service_percentage
          : undefined,
      service_fixed_amount:
        values.service_reward_type === "fixed"
          ? values.service_fixed_amount
          : undefined,

      // Membership rewards
      membership_reward_type: values.membership_reward_type,
      membership_percentage:
        values.membership_reward_type === "percentage"
          ? values.membership_percentage
          : undefined,
      membership_fixed_amount:
        values.membership_reward_type === "fixed"
          ? values.membership_fixed_amount
          : undefined,

      // Product rewards
      product_reward_type: values.product_reward_type,
      product_percentage:
        values.product_reward_type === "percentage"
          ? values.product_percentage
          : undefined,
      product_fixed_amount:
        values.product_reward_type === "fixed"
          ? values.product_fixed_amount
          : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Referral Program</h2>
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="is_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Enable Referral Program
                        </FormLabel>
                        <FormDescription>
                          Turn on to allow customers to earn rewards for
                          referring new customers
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {/* Services Reward Section */}
                <div className="bg-gray-50 p-4 rounded-md mt-6">
                  <h3 className="text-lg font-medium mb-4">
                    Service Referral Rewards
                  </h3>
                  <div className="space-y-4">
                    <div className="flex flex-row items-end gap-4">
                      <FormField
                        control={form.control}
                        name="service_reward_type"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <div className="flex items-center gap-1">
                              <FormLabel>Service Reward Type</FormLabel>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p>
                                      Choose whether to reward referrers with a
                                      percentage of the service bill or a fixed
                                      amount.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Select
                              disabled={isLoading}
                              onValueChange={field.onChange}
                              value={field.value}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select reward type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percentage">
                                  Percentage of Bill
                                </SelectItem>
                                <SelectItem value="fixed">
                                  Fixed Amount
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch("service_reward_type") === "percentage" && (
                        <FormField
                          control={form.control}
                          name="service_percentage"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <div className="flex items-center gap-1">
                                <FormLabel>Percentage</FormLabel>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p>
                                        The percentage of the service bill
                                        amount that will be given as reward to
                                        the referrer.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <FormControl>
                                <div className="flex items-center">
                                  <Input
                                    type="number"
                                    disabled={isLoading}
                                    {...field}
                                    className="w-24"
                                  />
                                  <span className="ml-2">%</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {form.watch("service_reward_type") === "fixed" && (
                        <FormField
                          control={form.control}
                          name="service_fixed_amount"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <div className="flex items-center gap-1">
                                <FormLabel>Fixed Amount</FormLabel>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p>
                                        The fixed amount that will be given as
                                        reward to the referrer for service
                                        purchases.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <FormControl>
                                <div className="flex items-center">
                                  <Input
                                    type="number"
                                    disabled={isLoading}
                                    {...field}
                                    className="w-24"
                                  />
                                  <span className="ml-2">₹</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                </div>
                {/* Membership Reward Section */}
                <div className="bg-gray-50 p-4 rounded-md mt-6">
                  <h3 className="text-lg font-medium mb-4">
                    Membership Referral Rewards
                  </h3>
                  <div className="space-y-4">
                    <div className="flex flex-row items-end gap-4">
                      <FormField
                        control={form.control}
                        name="membership_reward_type"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <div className="flex items-center gap-1">
                              <FormLabel>Membership Reward Type</FormLabel>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p>
                                      Choose whether to reward referrers with a
                                      percentage of the membership cost or a
                                      fixed amount.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Select
                              disabled={isLoading}
                              onValueChange={field.onChange}
                              value={field.value}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select reward type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percentage">
                                  Percentage of Cost
                                </SelectItem>
                                <SelectItem value="fixed">
                                  Fixed Amount
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch("membership_reward_type") ===
                        "percentage" && (
                        <FormField
                          control={form.control}
                          name="membership_percentage"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <div className="flex items-center gap-1">
                                <FormLabel>Percentage</FormLabel>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p>
                                        The percentage of the membership cost
                                        that will be given as reward to the
                                        referrer.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <FormControl>
                                <div className="flex items-center">
                                  <Input
                                    type="number"
                                    disabled={isLoading}
                                    {...field}
                                    className="w-24"
                                  />
                                  <span className="ml-2">%</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {form.watch("membership_reward_type") === "fixed" && (
                        <FormField
                          control={form.control}
                          name="membership_fixed_amount"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <div className="flex items-center gap-1">
                                <FormLabel>Fixed Amount</FormLabel>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p>
                                        The fixed amount that will be given as
                                        reward to the referrer for membership
                                        purchases.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <FormControl>
                                <div className="flex items-center">
                                  <Input
                                    type="number"
                                    disabled={isLoading}
                                    {...field}
                                    className="w-24"
                                  />
                                  <span className="ml-2">₹</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                </div>
                {/* Product Reward Section */}
                <div className="bg-gray-50 p-4 rounded-md mt-6">
                  <h3 className="text-lg font-medium mb-4">
                    Product Referral Rewards
                  </h3>
                  <div className="space-y-4">
                    <div className="flex flex-row items-end gap-4">
                      <FormField
                        control={form.control}
                        name="product_reward_type"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <div className="flex items-center gap-1">
                              <FormLabel>Product Reward Type</FormLabel>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p>
                                      Choose whether to reward referrers with a
                                      percentage of the product price or a fixed
                                      amount.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Select
                              disabled={isLoading}
                              onValueChange={field.onChange}
                              value={field.value}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select reward type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percentage">
                                  Percentage of Price
                                </SelectItem>
                                <SelectItem value="fixed">
                                  Fixed Amount
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch("product_reward_type") === "percentage" && (
                        <FormField
                          control={form.control}
                          name="product_percentage"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <div className="flex items-center gap-1">
                                <FormLabel>Percentage</FormLabel>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p>
                                        The percentage of the product price that
                                        will be given as reward to the referrer.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <FormControl>
                                <div className="flex items-center">
                                  <Input
                                    type="number"
                                    disabled={isLoading}
                                    {...field}
                                    className="w-24"
                                  />
                                  <span className="ml-2">%</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {form.watch("product_reward_type") === "fixed" && (
                        <FormField
                          control={form.control}
                          name="product_fixed_amount"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <div className="flex items-center gap-1">
                                <FormLabel>Fixed Amount</FormLabel>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p>
                                        The fixed amount that will be given as
                                        reward to the referrer for product
                                        purchases.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <FormControl>
                                <div className="flex items-center">
                                  <Input
                                    type="number"
                                    disabled={isLoading}
                                    {...field}
                                    className="w-24"
                                  />
                                  <span className="ml-2">₹</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-32 mt-6">
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    </span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

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
      case "referral-program":
        return <ReferralProgram />;

      case "discount-reward-usage":
        return <DiscountRewardUsage />;

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
              </Button>{" "}
              <Button
                variant={activeTab === "gift-cards" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("gift-cards")}
              >
                <Gift className="mr-2 h-4 w-4" />
                Gift Cards
              </Button>{" "}
              <Button
                variant={activeTab === "referral-program" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("referral-program")}
              >
                <Users className="mr-2 h-4 w-4" />
                Referral Program
              </Button>
              <Button
                variant={
                  activeTab === "discount-reward-usage" ? "default" : "ghost"
                }
                className="w-full justify-start"
                onClick={() => setActiveTab("discount-reward-usage")}
              >
                <Settings className="mr-2 h-4 w-4" />
                Discount & Reward Usage
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
