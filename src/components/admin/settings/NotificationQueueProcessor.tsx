import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/lib/toast"; // Updated import

// Define type for notification queue items
interface NotificationQueueItem {
  id: string;
  appointment_id: string | null;
  notification_type: string;
  recipient_number: string;
  message_content: string;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
  processed_at: string | null;
  error_message: string | null;
  external_message_id?: string | null;
}

export function NotificationQueueProcessor() {
  const [notifications, setNotifications] = useState<NotificationQueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  
  // Fetch the queue
  const fetchQueue = async () => {
    const { data, error } = await supabase
      .from('notification_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data as NotificationQueueItem[]);
    }
  };

  // Process the queue (functionality removed)
  const handleProcessQueue = async () => {
    setProcessing(true);
    try {
      toast.warning("Notification processing has been disabled");
      await fetchQueue(); // Refresh the list
    } finally {
      setProcessing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchQueue();
    
    // Set up a subscription to notifications table
    const subscription = supabase
      .channel('notification_queue_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'notification_queue' }, 
        () => fetchQueue()
      )
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Sent</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Notification Queue</h3>
        <Button 
          onClick={handleProcessQueue} 
          disabled={processing}
        >
          {processing && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          Process Queue
        </Button>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                  No notifications in queue
                </TableCell>
              </TableRow>
            ) : (
              notifications.map((notification) => (
                <TableRow key={notification.id}>
                  <TableCell className="font-medium">
                    {notification.notification_type}
                  </TableCell>
                  <TableCell>{notification.recipient_number}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {notification.created_at && formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(notification.status)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
