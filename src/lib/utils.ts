import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as an Indian Rupee (INR) currency string.
 *
 * This function takes a number as input and uses the Intl.NumberFormat API
 * to format it as an Indian currency string with the Rupee symbol (₹) and
 * two decimal places.
 *
 * @param price - The number to format as a currency.
 * @returns A string representing the formatted currency (e.g., "₹1,234.56").
 *
 * @example
 * formatPrice(1234.56); // Returns "₹1,234.56"
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(price);
}

export function generateStrongPassword(length: number = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}
