import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format as dateFnsFormat } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) {
    return "₹0.00";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(price);
};

export const formatPhoneNumber = (phoneNumber: string | null): string => {
  if (!phoneNumber) return "";
  
  // Keep only digits
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Format for India: +91 XXXXX XXXXX
  if (digits.length === 10) {
    return `+91 ${digits.substring(0, 5)} ${digits.substring(5)}`;
  }
  
  // If it already has country code
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits.substring(0, 2)} ${digits.substring(2, 7)} ${digits.substring(7)}`;
  }
  
  return phoneNumber;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

export function generateStrongPassword(length: number = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

export const formatDate = (date: Date | string | number): string => {
  if (!date) return "";
  return dateFnsFormat(new Date(date), "MMMM d, yyyy");
};

export const getMembershipDiscount = (
  serviceId: string | null, 
  packageId: string | null, 
  amount: number,
  customerMemberships: any[]
) => {
  if (!serviceId && !packageId) return null;
  if (!customerMemberships || customerMemberships.length === 0) return null;
  
  // Find all applicable memberships for this service or package
  const applicableMemberships = customerMemberships.filter((membership: any) => {
    const mem = membership.membership;
    if (!mem) return false;
    
    // Check if service/package is in the applicable list
    const isApplicable = 
      (serviceId && mem.applicable_services && mem.applicable_services.includes(serviceId)) ||
      (packageId && mem.applicable_packages && mem.applicable_packages.includes(packageId));
    
    // Check minimum billing amount if set
    const meetsMinBilling = !mem.min_billing_amount || 
      amount >= mem.min_billing_amount;
      
    return isApplicable && meetsMinBilling;
  });
  
  if (applicableMemberships.length === 0) return null;
  
  // Get the best discount
  let bestDiscount = 0;
  let bestMembership = null;
  
  applicableMemberships.forEach((membership: any) => {
    const mem = membership.membership;
    if (!mem) return;
    
    let discountAmount = 0;
    
    if (mem.discount_type === 'percentage') {
      discountAmount = amount * (mem.discount_value / 100);
      
      // Apply max discount cap if exists
      if (mem.max_discount_value) {
        discountAmount = Math.min(discountAmount, mem.max_discount_value);
      }
    } else {
      discountAmount = Math.min(mem.discount_value, amount);
    }
    
    if (discountAmount > bestDiscount) {
      bestDiscount = discountAmount;
      bestMembership = membership;
    }
  });
  
  if (!bestMembership) return null;
  
  return {
    membershipId: bestMembership.membership_id,
    membershipName: bestMembership.membership?.name,
    discountType: bestMembership.membership?.discount_type,
    discountValue: bestMembership.membership?.discount_value,
    calculatedDiscount: bestDiscount
  };
};
