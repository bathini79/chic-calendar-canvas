
import React from "react";
import { useNavigate } from "react-router-dom";

export function LoyaltyProgram() {
  // This is just a wrapper to reuse the LoyaltyProgram component in the Sales tab
  const navigate = useNavigate();
  
  React.useEffect(() => {
    // Import the component dynamically to avoid circular dependencies
    import("../LoyaltyProgram").then((module) => {
      const LoyaltyProgramComponent = module.default;
      // We'll render it in place
    });
  }, []);

  return <div id="loyalty-program-container" />;
}
