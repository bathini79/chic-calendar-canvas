
import { UserDetailsForm } from "@/components/customer/profile/UserDetailsForm";

const UserDetails = () => {
  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">My Account</h1>
      <div className="max-w-2xl mx-auto">
        <UserDetailsForm />
      </div>
    </div>
  );
};

export default UserDetails;
