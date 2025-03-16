
// Update the interface to include onCheckout
interface AppointmentDetailsDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
  onCheckout?: (appointment: Appointment) => void;
  onEdit?: () => void;
}
