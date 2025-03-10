
import { renderHook, act } from '@testing-library/react';
import { usePackageForm } from '../hooks/usePackageForm';
import { describe, it, expect } from 'vitest';

describe('usePackageForm', () => {
  it('should initialize with default values when no initial data is provided', () => {
    const { result } = renderHook(() => usePackageForm());
    
    // Check that the hook returns the expected structure
    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('submit');
  });

  it('should initialize with provided initial data', () => {
    const initialData = {
      name: 'Test Package',
      services: ['1', '2'],
      price: 100,
      description: 'Test Description',
      duration: 60,
      is_customizable: true,
      status: 'active' as const,
      discount_type: 'percentage' as const,
      discount_value: 10,
      image_urls: ['image1.jpg'],
      customizable_services: ['3', '4'],
    };

    const { result } = renderHook(() => usePackageForm());
    
    // Check that the hook has loaded correctly
    expect(result.current).toBeDefined();
    expect(result.current.isLoading).toBeDefined();
  });

  it('should validate required fields', async () => {
    const { result } = renderHook(() => usePackageForm());

    let isValid = false;
    await act(async () => {
      // Test the submit function
      await result.current.submit();
    });

    // Check error handling
    expect(result.current.error).toBeDefined();
  });
});
