
// Fix the payment method type in MembershipSale component
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { formatPrice } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SummaryView } from '@/pages/admin/bookings/components/SummaryView';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type PaymentMethod = 'cash' | 'online';

type MembershipSaleProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer?: any;
    membership?: any;
    onSuccess?: () => void;
};

export function MembershipSale({ open, onOpenChange, customer, membership, onSuccess }: MembershipSaleProps) {
    const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
    const [selectedMembership, setSelectedMembership] = useState<any>(membership);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(customer);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [printReceipt, setPrintReceipt] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [saleData, setSaleData] = useState<any>(null);

    // Reset the state when the dialog opens
    React.useEffect(() => {
        if (open) {
            setStep('details');
            setSelectedMembership(membership);
            setSelectedCustomer(customer);
            setPaymentMethod('cash');
            setPrintReceipt(true);
            setSaleData(null);
        }
    }, [open, customer, membership]);

    const handleNext = () => {
        if (step === 'details') {
            setStep('payment');
        }
    };

    const handleBack = () => {
        if (step === 'payment') {
            setStep('details');
        }
    };

    const completeSale = async () => {
        if (!selectedCustomer || !selectedMembership) {
            toast.error("Customer and membership must be selected");
            return;
        }

        setIsLoading(true);
        try {
            const now = new Date();
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + selectedMembership.duration_months);

            const transaction = {
                customer_id: selectedCustomer.id,
                membership_id: selectedMembership.id,
                total_amount: selectedMembership.price,
                payment_method: paymentMethod,
                sale_date: now.toISOString(),
                status: 'completed',
                valid_from: now.toISOString(),
                valid_until: expiryDate.toISOString(),
            };

            // Insert the sale record
            const { data: saleRecord, error: saleError } = await supabase
                .from('membership_sales')
                .insert(transaction)
                .select()
                .single();

            if (saleError) throw saleError;

            // Insert into customer_memberships
            const { error: membershipError } = await supabase
                .from('customer_memberships')
                .insert({
                    customer_id: selectedCustomer.id,
                    membership_id: selectedMembership.id,
                    start_date: now.toISOString(),
                    end_date: expiryDate.toISOString(),
                    status: 'active',
                    sale_id: saleRecord.id
                });

            if (membershipError) throw membershipError;

            // Insert into financial transactions
            const { error: transactionError } = await supabase
                .from('transactions')
                .insert({
                    customer_id: selectedCustomer.id,
                    amount: selectedMembership.price,
                    payment_method: paymentMethod,
                    transaction_date: now.toISOString(),
                    transaction_type: 'membership_sale',
                    status: 'completed',
                    reference_id: saleRecord.id,
                    notes: `Membership: ${selectedMembership.name}`
                });

            if (transactionError) throw transactionError;

            setSaleData({
                id: saleRecord.id,
                ...transaction,
                membership: selectedMembership,
                customer: selectedCustomer,
            });

            setStep('success');
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Error completing membership sale:', error);
            toast.error('Failed to complete the sale. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>
                        {step === 'details' && "Membership Sale"}
                        {step === 'payment' && "Payment"}
                        {step === 'success' && "Sale Complete"}
                    </DialogTitle>
                </DialogHeader>

                {step === 'details' && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="customer">Customer</Label>
                            <div className="p-3 border rounded-md bg-gray-50">
                                {selectedCustomer ? (
                                    <div>
                                        <div className="font-medium">{selectedCustomer.full_name}</div>
                                        <div className="text-sm text-gray-500">
                                            {selectedCustomer.email && <div>{selectedCustomer.email}</div>}
                                            {selectedCustomer.phone_number && <div>{selectedCustomer.phone_number}</div>}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-gray-500">No customer selected</div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="membership">Membership</Label>
                            <div className="p-3 border rounded-md bg-gray-50">
                                {selectedMembership ? (
                                    <div>
                                        <div className="font-medium">{selectedMembership.name}</div>
                                        <div className="text-sm text-gray-500">{formatPrice(selectedMembership.price)} / {selectedMembership.duration_months} months</div>
                                        {selectedMembership.description && (
                                            <div className="mt-2 text-sm">{selectedMembership.description}</div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-gray-500">No membership selected</div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={handleNext} disabled={!selectedCustomer || !selectedMembership}>
                                Continue to Payment
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'payment' && (
                    <div className="space-y-6">
                        <div>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span>Membership</span>
                                            <span>{selectedMembership.name}</span>
                                        </div>
                                        <div className="flex justify-between font-semibold">
                                            <span>Total</span>
                                            <span>{formatPrice(selectedMembership.price)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-2">
                            <Label>Payment Method</Label>
                            <RadioGroup defaultValue={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="cash" id="cash" />
                                    <Label htmlFor="cash">Cash</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="online" id="online" />
                                    <Label htmlFor="online">Online Payment</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="print-receipt"
                                checked={printReceipt}
                                onCheckedChange={setPrintReceipt}
                            />
                            <Label htmlFor="print-receipt">Print Receipt</Label>
                        </div>

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={handleBack}>
                                Back
                            </Button>
                            <Button onClick={completeSale} disabled={isLoading}>
                                {isLoading ? "Processing..." : "Complete Sale"}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'success' && saleData && (
                    <div className="space-y-6">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                            <div className="text-center text-green-700">
                                <div className="text-lg font-semibold">Sale Completed Successfully</div>
                                <div>Receipt #{saleData.id.substring(0, 8)}</div>
                            </div>
                        </div>

                        <SummaryView 
                            customerData={saleData.customer}
                            appointmentId={saleData.id}
                            transaction={{
                                id: saleData.id,
                                date: format(new Date(saleData.sale_date), 'PPP'),
                                time: format(new Date(saleData.sale_date), 'p'),
                                paymentMethod: saleData.payment_method,
                                items: [
                                    {
                                        name: `${saleData.membership.name} Membership`,
                                        price: saleData.membership.price,
                                        quantity: 1
                                    }
                                ],
                                subtotal: saleData.total_amount,
                                tax: 0,
                                total: saleData.total_amount,
                                type: 'membership'
                            }}
                        />

                        <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
