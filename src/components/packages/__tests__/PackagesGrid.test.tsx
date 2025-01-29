import { render, screen } from '@testing-library/react';
import { PackagesGrid } from '../PackagesGrid';
import { describe, it, expect, vi } from 'vitest';
import * as reactQuery from '@tanstack/react-query';

// Mock the useQuery hook
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

describe('PackagesGrid', () => {
  it('renders loading state', () => {
    vi.mocked(reactQuery.useQuery).mockReturnValueOnce({
      isLoading: true,
      data: undefined,
      error: null,
      isError: false,
      isPending: true,
      isSuccess: false,
      status: 'loading',
      refetch: vi.fn(),
    } as any);
    
    render(<PackagesGrid searchQuery="" onEdit={() => {}} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders packages when data is available', () => {
    vi.mocked(reactQuery.useQuery).mockReturnValueOnce({
      data: [{ id: '1', name: 'Package 1' }, { id: '2', name: 'Package 2' }],
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as any);
    
    render(<PackagesGrid searchQuery="" onEdit={() => {}} />);
    expect(screen.getByText(/package 1/i)).toBeInTheDocument();
    expect(screen.getByText(/package 2/i)).toBeInTheDocument();
  });

  it('renders empty state when no packages are available', () => {
    vi.mocked(reactQuery.useQuery).mockReturnValueOnce({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: 'success',
      refetch: vi.fn(),
    } as any);
    
    render(<PackagesGrid searchQuery="" onEdit={() => {}} />);
    expect(screen.getByText(/no packages available/i)).toBeInTheDocument();
  });
});