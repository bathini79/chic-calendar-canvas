import { renderHook, act } from '@testing-library/react';
import { useScheduleState } from '../useScheduleState';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      })),
      insert: vi.fn(() => ({
        error: null
      }))
    }))
  }
}));

describe('useScheduleState', () => {
  const mockEmployee = {
    id: '123',
    name: 'John Doe'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useScheduleState(mockEmployee));

    expect(result.current.scheduleType).toBe("1");
    expect(result.current.currentWeek).toBe(0);
    expect(result.current.weekConfigs).toHaveLength(4);
  });

  it('should update schedule type', () => {
    const { result } = renderHook(() => useScheduleState(mockEmployee));

    act(() => {
      result.current.setScheduleType("2");
    });

    expect(result.current.scheduleType).toBe("2");
  });

  it('should handle submit successfully', async () => {
    const { result } = renderHook(() => useScheduleState(mockEmployee));

    const success = await result.current.handleSubmit();
    expect(success).toBe(true);
  });
});