
// This is a placeholder file for tests
import { useState } from 'react';

export const usePackageForm = (initialData: any = {}) => {
  const [data] = useState(initialData);
  
  return {
    data,
    isLoading: false,
    error: null,
    submit: async () => {},
    getValues: () => ({}),
    trigger: () => Promise.resolve(true),
    formState: { 
      errors: {},
      isValid: true
    }
  };
};

export default usePackageForm;
