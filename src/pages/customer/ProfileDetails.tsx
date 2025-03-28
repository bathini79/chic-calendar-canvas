
import React from "react";
import ProfilePage from "@/components/customer/profile/ProfilePage";
import { SidebarProvider } from "@/components/ui/sidebar";

const ProfileDetails = () => {
  return (
    <SidebarProvider>
      <ProfilePage />
    </SidebarProvider>
  );
};

export default ProfileDetails;
