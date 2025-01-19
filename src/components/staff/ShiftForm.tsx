import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { startOfDay, format } from "date-fns";

const formSchema = z.object({
  employee_id: z.string().min(1, "Employee is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  status: z.enum(['pending', 'approved', 'declined']).default('pending'),
});

type ShiftFormData = z.infer<typeof formSchema>;

interface ShiftFormProps {
  initialData?: any;
  employee?: any;
  selectedDate?: Date | null;
  onSubmit: (data: ShiftFormData) => void;
  onCancel: () => void;
}

export function ShiftForm({ 
  initialData, 
  employee, 
  selectedDate,
  onSubmit, 
  onCancel 
}: ShiftFormProps) {
  const getDefaultDateTime = () => {
    if (selectedDate) {
      const date = startOfDay(selectedDate);
      return format(date, "yyyy-MM-dd'T'HH:mm");
    }
    return '';
  };

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: employee?.id || initialData?.employee_id || '',
      start_time: initialData?.start_time 
        ? new Date(initialData.start_time).toISOString().slice(0, 16) 
        : getDefaultDateTime(),
      end_time: initialData?.end_time 
        ? new Date(initialData.end_time).toISOString().slice(0, 16)
        : getDefaultDateTime(),
      status: initialData?.status || 'pending',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="start_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Time *</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="end_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Time *</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? 'Update Shift' : 'Create Shift'}
          </Button>
        </div>
      </form>
    </Form>
  );
}