
import { useState } from 'react';

/**
 * Hook to manage package form state
 */
export const usePackageForm = () => {
  const [formState, setFormState] = useState({
    name: '',
    description: '',
    price: 0,
    duration: 0,
    status: 'active',
    selectedServices: [],
    isCustomizable: false,
    customizableServices: [],
    categories: [],
    packageServices: [],
  });

  const updateFormState = (updates: Partial<typeof formState>) => {
    setFormState(prev => ({ ...prev, ...updates }));
  };

  return {
    formState,
    updateFormState,
    setFormState,
  };
};

export default usePackageForm;
