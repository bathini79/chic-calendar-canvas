
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format as dateFormat } from "date-fns";

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
  return dateFormat(new Date(date), "MMMM d, yyyy");
};
