import { renderHook, act } from '@testing-library/react';
import { usePackageForm } from '../hooks/usePackageForm';
import { describe, it, expect } from 'vitest';

describe('usePackageForm', () => {
  it('should initialize with default values when no initial data is provided', () => {
    const { result } = renderHook(() => usePackageForm());
    
    expect(result.current.getValues()).toEqual({
      name: '',
      services: [],
      price: 0,
      description: '',
      duration: 0,
      is_customizable: false,
      status: 'active',
      discount_type: 'none',
      discount_value: 0,
      image_urls: [],
      customizable_services: [],
    });
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

    const { result } = renderHook(() => usePackageForm(initialData));
    expect(result.current.getValues()).toEqual(initialData);
  });

  it('should validate required fields', async () => {
    const { result } = renderHook(() => usePackageForm());

    let isValid = false;
    await act(async () => {
      isValid = await result.current.trigger();
    });

    expect(isValid).toBe(false);
    expect(result.current.formState.errors.name).toBeDefined();
    expect(result.current.formState.errors.services).toBeDefined();
  });
});