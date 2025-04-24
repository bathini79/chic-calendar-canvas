import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EmploymentTypesTableProps {
  employmentTypes: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  is_configurable: z.boolean().default(true),
});

export function EmploymentTypesTable({ employmentTypes, isLoading, onRefresh }: EmploymentTypesTableProps) {
  const [openDialog, setOpenDialog] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<any | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      is_configurable: true,
    },
  });

  const handleOpenDialog = (type?: any) => {
    if (type) {
      setEditingType(type);
      form.reset({
        name: type.name,
        description: type.description || "",
        is_configurable: type.is_configurable,
      });
    } else {
      setEditingType(null);
      form.reset({
        name: "",
        description: "",
        is_configurable: true,
      });
    }
    setOpenDialog(true);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (editingType) {
        const { error } = await supabase
          .from("employment_types")
          .update({
            name: values.name,
            description: values.description,
            is_configurable: values.is_configurable,
          })
          .eq("id", editingType.id);

        if (error) throw error;
        toast.success("Employment type updated successfully");
      } else {
        const { error } = await supabase
          .from("employment_types")
          .insert([{
            name: values.name,
            description: values.description,
            is_configurable: values.is_configurable,
            permissions: []
          }]);

        if (error) throw error;
        toast.success("Employment type created successfully");
      }
      
      setOpenDialog(false);
      onRefresh();
    } catch (error: any) {
      toast.error("Error saving employment type: " + error.message);
      console.error(error);
    }
  };

  const handleDeleteType = async (id: string) => {
    try {
      // Check if the employment type is in use
      const { data: employees, error: checkError } = await supabase
        .from("employees")
        .select("id")
        .eq("employment_type", id)
        .limit(1);

      if (checkError) throw checkError;

      if (employees && employees.length > 0) {
        toast.error("Cannot delete this employment type because it is used by one or more employees");
        setConfirmDelete(null);
        return;
      }

      const { error } = await supabase
        .from("employment_types")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Employment type deleted successfully");
      setConfirmDelete(null);
      onRefresh();
    } catch (error: any) {
      toast.error("Error deleting employment type: " + error.message);
      console.error(error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Employment Types</CardTitle>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" /> Add Type
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-6">
          Configure employment types and their permissions. Admins always have full access to all features.
        </p>

        {isLoading ? (
          <div className="flex justify-center items-center h-24">
            <p>Loading employment types...</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Configurable</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employmentTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6">
                      No employment types found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  employmentTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{type.description || "—"}</TableCell>
                      <TableCell>{type.is_configurable ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(type)}
                            disabled={type.name === "Admin" && !type.is_configurable}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete(type.id)}
                            disabled={type.name === "Admin" || !type.is_configurable}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingType ? "Edit Employment Type" : "Create Employment Type"}
              </DialogTitle>
              <DialogDescription>
                {editingType
                  ? "Edit the existing employment type."
                  : "Add a new employment type to your business."}
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
                        <Input placeholder="Employment Type Name" {...field} />
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
                          placeholder="Describe this employment type"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_configurable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Configurable</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Allow this employment type to be edited and assigned custom permissions
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={editingType?.name === "Admin"}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">
                    {editingType ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to delete this employment type? This action cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => confirmDelete && handleDeleteType(confirmDelete)}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}