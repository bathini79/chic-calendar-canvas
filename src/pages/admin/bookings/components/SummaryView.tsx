import { Appointment } from "../types";

export interface SummaryViewProps {
  appointmentId: string;
  appointment?: Appointment;
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  discountType: string;
  discountValue: number;
}

export const SummaryView = ({
  appointmentId,
  appointment,
  subtotal,
  discountAmount,
  total,
  paymentMethod,
  discountType,
  discountValue
}: SummaryViewProps) => {
  return (
    <div>
      <h3 className="text-lg font-semibold">Summary for Appointment ID: {appointmentId}</h3>
      {appointment && (
        <div>
          <p>Customer: {appointment.customer?.full_name}</p>
          <p>Status: {appointment.status}</p>
          <p>Notes: {appointment.notes}</p>
        </div>
      )}
      <div className="mt-4">
        <p>Subtotal: ${subtotal.toFixed(2)}</p>
        <p>Discount: -${discountAmount.toFixed(2)} ({discountType}: {discountValue})</p>
        <p>Total: ${total.toFixed(2)}</p>
        <p>Payment Method: {paymentMethod}</p>
      </div>
    </div>
  );
};
