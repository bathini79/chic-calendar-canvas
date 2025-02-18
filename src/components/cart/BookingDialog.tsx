import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Customer } from '@/pages/admin/bookings/types';
import { CalendarIcon } from '@/pages/admin/bookings/components/Icons';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomer: Customer | null;
  selectedServices: any[];
  selectedPackages: any[];
  selectedDate: Date | undefined;
  selectedTime: string | undefined;
  selectedStylists: Record<string, string>;
  notes: string;
  getTotalPrice: () => number;
  getTotalDuration: () => number;
  paymentMethod: 'cash' | 'online';
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  onFinalSave: () => Promise<void>;
}

const BookingDialog: React.FC<BookingDialogProps> = ({
  isOpen,
  onClose,
  selectedCustomer,
  selectedServices,
  selectedPackages,
  selectedDate,
  selectedTime,
  selectedStylists,
  notes,
  getTotalPrice,
  getTotalDuration,
  paymentMethod,
  discountType,
  discountValue,
  onFinalSave,
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await onFinalSave();
      toast.success('Booking confirmed successfully!');
      onClose();
    } catch (error: any) {
      toast.error(`Failed to confirm booking: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Confirm Booking</DialogTitle>
          <DialogDescription>
            Are you sure you want to confirm this booking?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div>
            <div className="text-sm font-medium leading-none">Customer</div>
            <p className="text-sm text-gray-500">{selectedCustomer?.full_name}</p>
          </div>
          <div>
            <div className="text-sm font-medium leading-none">Date and Time</div>
            <p className="text-sm text-gray-500">
              {selectedDate && selectedTime
                ? `${format(selectedDate, 'MMMM d, yyyy')} at ${selectedTime}`
                : 'Not selected'}
            </p>
          </div>
          <div>
            <div className="text-sm font-medium leading-none">Services</div>
            {selectedServices.length > 0 ? (
              <ul className="list-disc pl-4 text-sm text-gray-500">
                {selectedServices.map((service: any) => (
                  <li key={service.id}>{service.name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No services selected</p>
            )}
          </div>
          <div>
            <div className="text-sm font-medium leading-none">Packages</div>
            {selectedPackages.length > 0 ? (
              <ul className="list-disc pl-4 text-sm text-gray-500">
                {selectedPackages.map((pkg: any) => (
                  <li key={pkg.id}>{pkg.name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No packages selected</p>
            )}
          </div>
          <div>
            <div className="text-sm font-medium leading-none">Notes</div>
            <p className="text-sm text-gray-500">{notes || 'No notes'}</p>
          </div>
          <div>
            <div className="text-sm font-medium leading-none">Total Price</div>
            <p className="text-sm text-gray-500">${getTotalPrice()}</p>
          </div>
          <div>
            <div className="text-sm font-medium leading-none">Total Duration</div>
            <p className="text-sm text-gray-500">{getTotalDuration()} minutes</p>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? 'Confirming...' : 'Confirm Booking'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
