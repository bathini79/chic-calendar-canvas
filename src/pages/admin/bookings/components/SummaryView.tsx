import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "./StatusBadge";
import { useAppointmentActions } from "../hooks/useAppointmentActions";
import { Appointment, TransactionDetails } from "../types";

interface SummaryViewProps {
  appointmentId: string;
  transactions?: any[];
  onDateChange?: (date: Date) => void;
  selectedDate: Date;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  appointmentId,
  transactions = [],
  onDateChange,
  selectedDate
}) => {
  const [open, setOpen] = useState(false);
  const { fetchAppointmentDetails, isLoading } = useAppointmentActions();
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);

  useEffect(() => {
    const loadAppointmentDetails = async () => {
      const details = await fetchAppointmentDetails(appointmentId);
      setTransactionDetails(details);
    };

    loadAppointmentDetails();
  }, [appointmentId, fetchAppointmentDetails]);

  if (isLoading || !transactionDetails) {
    return <div>Loading...</div>;
  }

  const appointment = transactionDetails.originalSale;

  return (
    <div>
      <Card className="mb-4">
        <div className="p-6">
          <h4 className="font-semibold text-lg mb-4">Appointment Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Date:</strong> {format(new Date(appointment.start_time), "MMMM d, yyyy")}
            </div>
            <div>
              <strong>Time:</strong> {format(new Date(appointment.start_time), "h:mm a")}
            </div>
            <div>
              <strong>Customer:</strong> {appointment.customer?.full_name}
            </div>
            <div>
              <strong>Status:</strong> <StatusBadge status={appointment.status} />
            </div>
            <div>
              <strong>Total Price:</strong> ₹{appointment.total_price}
            </div>
            <div>
              <strong>Payment Method:</strong> {appointment.payment_method}
            </div>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="p-6">
          <h4 className="font-semibold text-lg mb-4">Bookings</h4>
          <ul>
            {appointment.bookings.map((booking) => (
              <li key={booking.id} className="py-2 border-b">
                {booking.service?.name || booking.package?.name}
                {booking.employee && (
                  <div className="text-sm text-gray-500">
                    Stylist: {booking.employee.name}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h4 className="font-semibold text-lg mb-4">Transactions</h4>
          {transactions.length === 0 ? (
            <div>No transactions found.</div>
          ) : (
            <ul>
              {transactions.map((transaction) => (
                <li key={transaction.id} className="py-2 border-b">
                  Transaction ID: {transaction.id}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
};
