import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BillGenerator } from '@/components/billing/BillGenerator';
import useBillService from '@/hooks/use-bill-service';
import { Download, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BillSummaryProps {
  appointmentId: string;
  showGenerateButton?: boolean;
}

export const BillSummary = ({ appointmentId, showGenerateButton = true }: BillSummaryProps) => {
  const [billGenerated, setBillGenerated] = useState(false);
  const [billData, setBillData] = useState<any>(null);
  const [sendingBill, setSendingBill] = useState(false);
  const [billSent, setBillSent] = useState(false);
  
  const { sendBillToCustomer } = useBillService();
  
  const handleBillGenerated = (data: any) => {
    setBillGenerated(true);
    setBillData(data);
  };
  
  const handleSendBill = async () => {
    if (!appointmentId) {
      toast.error('No appointment ID provided');
      return;
    }
    
    try {
      setSendingBill(true);
      const success = await sendBillToCustomer(appointmentId);
      
      if (success) {
        setBillSent(true);
        toast.success('Bill sent to customer via WhatsApp');
      }
    } catch (error) {
      console.error('Error sending bill:', error);
      toast.error('Failed to send bill to customer');
    } finally {
      setSendingBill(false);
    }
  };
  
  // If no appointment ID, show placeholder
  if (!appointmentId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
          <CardDescription>No appointment selected</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <p className="text-muted-foreground">Select an appointment to generate a bill</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice</CardTitle>
        <CardDescription>
          {billGenerated 
            ? `Invoice for appointment ${appointmentId.substring(0, 8).toUpperCase()}` 
            : 'Generate or download the customer invoice'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showGenerateButton && !billGenerated ? (
          <div className="flex justify-center">
            <BillGenerator 
              appointmentId={appointmentId} 
              onBillGenerated={handleBillGenerated} 
            />
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <BillGenerator 
                appointmentId={appointmentId} 
                onBillGenerated={handleBillGenerated} 
              />
            </div>
            
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={handleSendBill}
                disabled={sendingBill || billSent}
                className="gap-2"
              >
                {sendingBill ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : billSent ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Sent to Customer
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send via WhatsApp
                  </>
                )}
              </Button>
            </div>
            
            {billData?.appointment?.customer?.full_name && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <p>
                  Customer: {billData.appointment.customer.full_name}<br />
                  Phone: {billData.appointment.customer.phone_number || 'N/A'}<br />
                  Total: ₹{billData.appointment.total_price?.toFixed(2) || '0.00'}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};