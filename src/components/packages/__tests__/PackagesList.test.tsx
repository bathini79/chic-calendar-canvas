import { render, screen } from '@testing-library/react';
import { PackagesList } from '../PackagesList';
import { describe, it, expect, vi } from 'vitest';
import * as reactQuery from '@tanstack/react-query';

// Mock the useQuery hook
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn().mockReturnValue({
      data: [],
      isLoading: false,
    }),
  };
});

describe('PackagesList', () => {
  it('renders loading state', () => {
    vi.mocked(reactQuery.useQuery).mockReturnValueOnce({ isLoading: true });
    render(<PackagesList />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders packages when data is available', () => {
    vi.mocked(reactQuery.useQuery).mockReturnValueOnce({
      data: [{ id: '1', name: 'Package 1' }, { id: '2', name: 'Package 2' }],
      isLoading: false,
    });
    render(<PackagesList />);
    expect(screen.getByText(/package 1/i)).toBeInTheDocument();
    expect(screen.getByText(/package 2/i)).toBeInTheDocument();
  });

  it('renders empty state when no packages are available', () => {
    vi.mocked(reactQuery.useQuery).mockReturnValueOnce({
      data: [],
      isLoading: false,
    });
    render(<PackagesList />);
    expect(screen.getByText(/no packages available/i)).toBeInTheDocument();
  });
});
