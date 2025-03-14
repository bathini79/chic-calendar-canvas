
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Trash, Pencil, Plus, Tag, DollarSign, CalendarDays } from "lucide-react";
import { useMemberships, type Membership, type MembershipFormValues } from "@/hooks/use-memberships";
import { supabase } from "@/integrations/supabase/client";
import { FormDialog } from "@/components/ui/form-dialog";

const membershipFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  validity_period: z.coerce.number().min(1, "Validity period must be a positive number"),
  validity_unit: z.enum(["days", "months"]),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.coerce.number().min(0, "Discount value must be a positive number"),
  max_discount_value: z.coerce.number().min(0).optional().nullable(),
  min_billing_amount: z.coerce.number().min(0).optional().nullable(),
  applicable_services: z.array(z.string()).default([]),
  applicable_packages: z.array(z.string()).default([]),
});

export default function Memberships() {
  const { memberships, isLoading, fetchMemberships, createMembership, updateMembership, deleteMembership } = useMemberships();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [showServicesDialog, setShowServicesDialog] = useState(false);
  const [showPackagesDialog, setShowPackagesDialog] = useState(false);

  const form = useForm<z.infer<typeof membershipFormSchema>>({
    resolver: zodResolver(membershipFormSchema),
    defaultValues: {
      name: "",
      description: "",
      validity_period: 30,
      validity_unit: "days",
      discount_type: "percentage",
      discount_value: 0,
      max_discount_value: null,
      min_billing_amount: null,
      applicable_services: [],
      applicable_packages: [],
    },
  });

  useEffect(() => {
    fetchMemberships();
    fetchServices();
    fetchPackages();
  }, []);

  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("id, name, selling_price").order("name");
    if (data) {
      setServices(data);
    }
  };

  const fetchPackages = async () => {
    const { data } = await supabase.from("packages").select("id, name, price").order("name");
    if (data) {
      setPackages(data);
    }
  };

  const handleOpenDialog = (membership?: Membership) => {
    if (membership) {
      setEditingMembership(membership);
      setSelectedServices(membership.applicable_services || []);
      setSelectedPackages(membership.applicable_packages || []);
      
      form.reset({
        name: membership.name,
        description: membership.description || "",
        validity_period: membership.validity_period,
        validity_unit: membership.validity_unit,
        discount_type: membership.discount_type,
        discount_value: membership.discount_value,
        max_discount_value: membership.max_discount_value,
        min_billing_amount: membership.min_billing_amount,
        applicable_services: membership.applicable_services || [],
        applicable_packages: membership.applicable_packages || [],
      });
    } else {
      setEditingMembership(null);
      setSelectedServices([]);
      setSelectedPackages([]);
      form.reset({
        name: "",
        description: "",
        validity_period: 30,
        validity_unit: "days",
        discount_type: "percentage",
        discount_value: 0,
        max_discount_value: null,
        min_billing_amount: null,
        applicable_services: [],
        applicable_packages: [],
      });
    }
    setOpenDialog(true);
  };

  const onSubmit = async (values: z.infer<typeof membershipFormSchema>) => {
    // Update values with selected services and packages
    values.applicable_services = selectedServices;
    values.applicable_packages = selectedPackages;
    
    try {
      if (editingMembership) {
        await updateMembership(editingMembership.id, values as MembershipFormValues);
      } else {
        await createMembership(values as MembershipFormValues);
      }
      setOpenDialog(false);
    } catch (error) {
      console.error("Error saving membership:", error);
    }
  };

  const handleDeleteMembership = async (id: string) => {
    if (confirm("Are you sure you want to delete this membership?")) {
      await deleteMembership(id);
    }
  };

  const handleServiceSelection = (serviceId: string) => {
    setSelectedServices(current => {
      if (current.includes(serviceId)) {
        return current.filter(id => id !== serviceId);
      } else {
        return [...current, serviceId];
      }
    });
  };

  const handlePackageSelection = (packageId: string) => {
    setSelectedPackages(current => {
      if (current.includes(packageId)) {
        return current.filter(id => id !== packageId);
      } else {
        return [...current, packageId];
      }
    });
  };

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Memberships</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Add Membership
        </Button>
      </div>

      {isLoading ? (
        <p>Loading memberships...</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Conditions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberships?.map((membership) => (
                <TableRow key={membership.id}>
                  <TableCell className="font-medium">
                    {membership.name}
                    {membership.description && (
                      <p className="text-sm text-muted-foreground">{membership.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {membership.validity_period} {membership.validity_unit}
                  </TableCell>
                  <TableCell>
                    {membership.discount_type === "percentage" 
                      ? `${membership.discount_value}%` 
                      : `₹${membership.discount_value}`}
                    {membership.max_discount_value && (
                      <div className="text-sm text-muted-foreground">
                        Max: ₹{membership.max_discount_value}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {membership.min_billing_amount && (
                      <div className="text-sm">
                        Min billing: ₹{membership.min_billing_amount}
                      </div>
                    )}
                    <div className="text-sm">
                      Services: {membership.applicable_services?.length || 0}
                    </div>
                    <div className="text-sm">
                      Packages: {membership.applicable_packages?.length || 0}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(membership)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteMembership(membership.id)}>
                        <Trash className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {memberships?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No memberships found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <FormDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        title={editingMembership ? "Edit Membership" : "Create Membership"}
        description={editingMembership 
          ? "Edit an existing membership for your clients." 
          : "Create a new membership for your clients."}
        form={form}
        onSubmit={onSubmit}
        submitLabel={editingMembership ? "Update" : "Create"}
      >
        <div className="grid gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Membership Name" {...field} />
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
                  <Textarea 
                    placeholder="Membership Description" 
                    {...field} 
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="validity_period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Validity Period</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="validity_unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Validity Unit</FormLabel>
                  <Select 
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
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
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
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
                      <SelectItem value="percentage">Percentage <Tag className="ml-2 h-4 w-4" /></SelectItem>
                      <SelectItem value="fixed">Fixed <DollarSign className="ml-2 h-4 w-4" /></SelectItem>
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
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="max_discount_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Discount Value (optional)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Leave empty for no limit" 
                    {...field} 
                    value={field.value === null ? "" : field.value}
                    onChange={(e) => {
                      field.onChange(e.target.value === "" ? null : Number(e.target.value));
                    }}
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
                <FormLabel>Minimum Billing Amount (optional)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Leave empty for no minimum" 
                    {...field} 
                    value={field.value === null ? "" : field.value}
                    onChange={(e) => {
                      field.onChange(e.target.value === "" ? null : Number(e.target.value));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <FormLabel>Applicable Services</FormLabel>
              <Dialog open={showServicesDialog} onOpenChange={setShowServicesDialog}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    type="button" 
                    className="w-full mt-2"
                  >
                    Select Services ({selectedServices.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Select Services</DialogTitle>
                    <DialogDescription>
                      Choose the services to which this membership applies.
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    {services.map((service) => (
                      <div key={service.id} className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id={`service-${service.id}`}
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={() => handleServiceSelection(service.id)}
                        />
                        <label
                          htmlFor={`service-${service.id}`}
                          className="flex items-center justify-between w-full text-sm font-medium leading-none cursor-pointer"
                        >
                          <span>{service.name}</span>
                          <Badge variant="secondary">₹{service.selling_price}</Badge>
                        </label>
                      </div>
                    ))}
                  </ScrollArea>
                  <DialogFooter>
                    <Button type="button" onClick={() => setShowServicesDialog(false)}>
                      Done
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            <div>
              <FormLabel>Applicable Packages</FormLabel>
              <Dialog open={showPackagesDialog} onOpenChange={setShowPackagesDialog}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    type="button" 
                    className="w-full mt-2"
                  >
                    Select Packages ({selectedPackages.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Select Packages</DialogTitle>
                    <DialogDescription>
                      Choose the packages to which this membership applies.
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    {packages.map((pkg) => (
                      <div key={pkg.id} className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id={`package-${pkg.id}`}
                          checked={selectedPackages.includes(pkg.id)}
                          onCheckedChange={() => handlePackageSelection(pkg.id)}
                        />
                        <label
                          htmlFor={`package-${pkg.id}`}
                          className="flex items-center justify-between w-full text-sm font-medium leading-none cursor-pointer"
                        >
                          <span>{pkg.name}</span>
                          <Badge variant="secondary">₹{pkg.price}</Badge>
                        </label>
                      </div>
                    ))}
                  </ScrollArea>
                  <DialogFooter>
                    <Button type="button" onClick={() => setShowPackagesDialog(false)}>
                      Done
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
