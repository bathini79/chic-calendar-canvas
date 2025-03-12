
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PaymentMethod = {
  id: string;
  name: string;
  is_enabled: boolean;
  is_default?: boolean;
  is_system?: boolean;
  created_at?: string;
  updated_at?: string;
};

export function usePaymentMethods() {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  async function fetchPaymentMethods() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("name");

      if (error) throw error;
      setPaymentMethods(data || []);
      return data;
    } catch (error: any) {
      toast.error(`Error fetching payment methods: ${error.message}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  }

  async function createPaymentMethod(newPaymentMethod: Omit<PaymentMethod, "id">) {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("payment_methods")
        .insert([newPaymentMethod])
        .select()
        .single();

      if (error) throw error;
      toast.success("Payment method created successfully");
      await fetchPaymentMethods();
      return data;
    } catch (error: any) {
      toast.error(`Error creating payment method: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function updatePaymentMethod(id: string, updatedPaymentMethod: Partial<PaymentMethod>) {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("payment_methods")
        .update(updatedPaymentMethod)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      toast.success("Payment method updated successfully");
      await fetchPaymentMethods();
      return data;
    } catch (error: any) {
      toast.error(`Error updating payment method: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function deletePaymentMethod(id: string) {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Payment method deleted successfully");
      await fetchPaymentMethods();
    } catch (error: any) {
      toast.error(`Error deleting payment method: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    paymentMethods,
    isLoading,
    fetchPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
  };
}
