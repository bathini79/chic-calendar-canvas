import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function TimeOffList() {
  const { data: requests, refetch } = useQuery({
    queryKey: ['time_off_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select(`
          *,
          employees (
            name,
            email
          )
        `)
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const handleStatusUpdate = async (id: string, status: 'approved' | 'declined') => {
    try {
      const { error } = await supabase
        .from('time_off_requests')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Request ${status} successfully`);
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests?.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{request.employees?.name}</TableCell>
              <TableCell>
                {format(new Date(request.start_date), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell>
                {format(new Date(request.end_date), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell>{request.reason}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  request.status === 'approved' 
                    ? 'bg-green-100 text-green-800'
                    : request.status === 'declined'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {request.status}
                </span>
              </TableCell>
              <TableCell className="text-right">
                {request.status === 'pending' && (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStatusUpdate(request.id, 'approved')}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStatusUpdate(request.id, 'declined')}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}