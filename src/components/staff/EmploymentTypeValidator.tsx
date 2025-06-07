import React, { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';

interface EmploymentTypeValidatorProps {
  form: UseFormReturn<any>;
  setSectionsWithErrors: React.Dispatch<React.SetStateAction<string[]>>;
  setErrorCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  employmentTypes: any[];
}

// This component doesn't render anything, it just adds validation logic for employment type and services
export function EmploymentTypeValidator({ 
  form, 
  setSectionsWithErrors, 
  setErrorCounts,
  employmentTypes 
}: EmploymentTypeValidatorProps) {
  const [canPerformServices, setCanPerformServices] = useState(false);

  // Function to determine if an employment type has the perform_services permission
  const checkPerformServicesPermission = (employmentTypeId: string) => {
    if (!employmentTypeId) return false;
    
    const selectedType = employmentTypes?.find((type: any) => type.id === employmentTypeId);
    return selectedType?.permissions?.includes('perform_services') || false;
  };

  // Update validation rules when employment type changes
  useEffect(() => {
    const employmentTypeId = form.getValues('employment_type_id');
    const hasPerformServices = checkPerformServicesPermission(employmentTypeId);
    setCanPerformServices(hasPerformServices);
    
    // Update validation for skills based on permissions
    if (hasPerformServices) {
      // Make skills required if employment type has perform_services permission
      const skills = form.getValues('skills') || [];
      if (skills.length === 0) {
        form.setError('skills', {
          type: 'manual',
          message: 'At least one service is required'
        });
        
        setSectionsWithErrors((prev: string[]) => {
          if (!prev.includes('services')) {
            return [...prev, 'services'];
          }
          return prev;
        });
        setErrorCounts((prev: Record<string, number>) => ({...prev, services: 1}));
      }
    } else {
      // Clear errors if perform_services permission is not present
      form.clearErrors('skills');
      setSectionsWithErrors((prev: string[]) => prev.filter(section => section !== 'services'));
      setErrorCounts((prev: Record<string, number>) => {
        const newCounts = {...prev};
        delete newCounts['services'];
        return newCounts;
      });
    }
  }, [employmentTypes, form]);

  // Watch for changes in skills field when perform_services is enabled
  useEffect(() => {
    if (!canPerformServices) {
      return;
    }
    
    const subscription = form.watch((value, { name }) => {
      if (name === 'skills' || !name) {
        const skills = value.skills || [];
        
        if (skills.length === 0) {
          form.setError('skills', {
            type: 'manual',
            message: 'At least one service is required'
          });
          setSectionsWithErrors((prev: string[]) => {
            if (!prev.includes('services')) {
              return [...prev, 'services'];
            }
            return prev;
          });
          setErrorCounts((prev: Record<string, number>) => ({...prev, services: 1}));
        } else {
          form.clearErrors('skills');
          setSectionsWithErrors((prev: string[]) => prev.filter(section => section !== 'services'));
          setErrorCounts((prev: Record<string, number>) => {
            const newCounts = {...prev};
            delete newCounts['services'];
            return newCounts;
          });
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [canPerformServices, form]);

  // Watch for changes and errors in the employment_type_id field
  useEffect(() => {
    const handleEmploymentTypeChange = () => {
      const hasError = !!form.formState.errors.employment_type_id;
      const isEmpty = !form.getValues('employment_type_id');
      
      if (hasError || (isEmpty && form.formState.isSubmitted)) {
        setSectionsWithErrors((prev: string[]) => {
          if (!prev.includes('settings')) {
            return [...prev, 'settings'];
          }
          return prev;
        });
        setErrorCounts((prev: Record<string, number>) => ({...prev, settings: 1}));
      } else if (!isEmpty) {
        setSectionsWithErrors((prev: string[]) => prev.filter(section => section !== 'settings'));
        setErrorCounts((prev: Record<string, number>) => {
          const newCounts = {...prev};
          delete newCounts['settings'];
          return newCounts;
        });
      }
    };
    
    // Initial check
    handleEmploymentTypeChange();
    
    // Set up subscription
    const subscription = form.watch((_, { name }) => {
      if (name === 'employment_type_id' || !name) {
        handleEmploymentTypeChange();
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, setSectionsWithErrors, setErrorCounts]);

  // This component doesn't render anything
  return null;
}
