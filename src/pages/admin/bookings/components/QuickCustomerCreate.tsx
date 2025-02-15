
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Customer } from "../types";

interface QuickCustomerCreateProps {
  onCreated: (customer: Customer) => void;
}

export function QuickCustomerCreate({ onCreated }: QuickCustomerCreateProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Create auth user with a random password
      const password = Math.random().toString(36).slice(-8);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password,
        options: {
          data: {
            full_name: formData.full_name,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update profile with admin_created flag
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .update({
            phone_number: formData.phone_number,
            admin_created: true
          })
          .eq('id', authData.user.id)
          .select()
          .single();

        if (profileError) throw profileError;

        toast.success("Customer created successfully");
        onCreated(profileData as Customer);
      }
    } catch (error) {
      console.error('Create customer error:', error);
      toast.error("Error creating customer");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Full Name</label>
        <Input
          required
          value={formData.full_name}
          onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <Input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Phone</label>
        <Input
          type="tel"
          value={formData.phone_number}
          onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
        />
      </div>
      
      <Button type="submit" className="w-full">
        Create Customer
      </Button>
    </form>
  );
}
