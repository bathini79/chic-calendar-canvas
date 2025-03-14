
import React from "react";
import { useNavigate } from "react-router-dom";

export function Memberships() {
  // This is just a wrapper to reuse the Memberships component in the Sales tab
  const navigate = useNavigate();
  
  React.useEffect(() => {
    // Import the component dynamically to avoid circular dependencies
    import("../Memberships").then((module) => {
      const MembershipsComponent = module.default;
      // We'll render it in place
    });
  }, []);

  return <div id="memberships-container" />;
}
