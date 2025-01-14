export type UserRole = "customer" | "admin" | "superadmin";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
}