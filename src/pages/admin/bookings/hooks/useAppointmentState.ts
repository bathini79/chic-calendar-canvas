import { useState } from "react";
import type { Customer } from "../types";

export const useAppointmentState = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [selectedStylists, setSelectedStylists] = useState<
    Record<string, string>
  >({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [discountType, setDiscountType] = useState<
    "none" | "percentage" | "fixed"
  >("none");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [customizedServices, setCustomizedServices] = useState({});
  const [appliedTaxId, setAppliedTaxId] = useState<string | null>(null);
  const [taxAmount, setTaxAmount] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [pointsRedeemed, setPointsRedeemed] = useState(0);
  const [pointsDiscountAmount, setPointsDiscountAmount] = useState(0);

  const resetState = () => {
    setSelectedCustomer(null);
    setShowCreateForm(false);
    setSelectedServices([]);
    setSelectedPackages([]);
    setSelectedStylists({});
    setSelectedDate(undefined);
    setSelectedTime(undefined);
    setNotes("");
    setPaymentMethod("cash");
    setDiscountType("none");
    setDiscountValue(0);
    setAppointmentNotes("");
    setCustomizedServices({});
    setAppliedTaxId(null);
    setTaxAmount(0);
    setPointsEarned(0);
    setPointsRedeemed(0);
    setPointsDiscountAmount(0);
  };

  return {
    selectedCustomer,
    setSelectedCustomer,
    showCreateForm,
    setShowCreateForm,
    selectedServices,
    setSelectedServices,
    selectedPackages,
    setSelectedPackages,
    selectedStylists,
    setSelectedStylists,
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    paymentMethod,
    setPaymentMethod,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    appointmentNotes,
    setAppointmentNotes,
    resetState,
    customizedServices,
    setCustomizedServices,
    appliedTaxId,
    setAppliedTaxId,
    taxAmount,
    setTaxAmount,
    pointsEarned,
    setPointsEarned,
    pointsRedeemed,
    setPointsRedeemed,
    pointsDiscountAmount,
    setPointsDiscountAmount,
  };
};
