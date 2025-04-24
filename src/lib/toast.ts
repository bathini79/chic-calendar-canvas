import { toast as sonnerToast } from "sonner";

type ToastVariant = "default" | "success" | "error" | "warning" | "loading";

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  id?: string;
  dismissible?: boolean;
}

/**
 * Centralized toast notification system that works consistently
 * across all admin components.
 * 
 * This utility wraps the Sonner toast library to provide a consistent API.
 * 
 * @example
 * // Basic usage
 * toast("Item created successfully");
 * 
 * // With variant
 * toast.success("Order completed");
 * toast.error("Failed to save changes");
 * toast.warning("This action cannot be undone");
 * 
 * // With additional options
 * toast.success("Profile updated", {
 *   description: "Your profile changes have been saved",
 *   duration: 5000,
 *   action: {
 *     label: "View",
 *     onClick: () => navigate("/profile")
 *   }
 * });
 */
function showToast(message: string, options?: ToastOptions): void {
  sonnerToast(message, options);
}

// Variant methods
showToast.success = (message: string, options?: ToastOptions): void => {
  sonnerToast.success(message, options);
};

showToast.error = (message: string, options?: ToastOptions): void => {
  sonnerToast.error(message, options);
};

showToast.warning = (message: string, options?: ToastOptions): void => {
  sonnerToast.warning(message, options);
};

showToast.loading = (message: string, options?: ToastOptions): void => {
  return sonnerToast.loading(message, options);
};

// Re-export as both 'toast' for direct import and as default
export const toast = showToast;
export default showToast;