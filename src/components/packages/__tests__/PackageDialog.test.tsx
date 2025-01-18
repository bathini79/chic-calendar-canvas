import { render, screen, fireEvent } from '@testing-library/react';
import { PackageDialog } from '../PackageDialog';
import { vi } from 'vitest';

// Mock the components and hooks
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
  useQuery: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          data: [],
          error: null,
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () => ({
            data: null,
            error: null,
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => ({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    }),
  },
}));

describe('PackageDialog', () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when open is true', () => {
    render(
      <PackageDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByText(/Create Package/i)).toBeInTheDocument();
  });

  it('does not render dialog when open is false', () => {
    render(
      <PackageDialog
        open={false}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.queryByText(/Create Package/i)).not.toBeInTheDocument();
  });

  it('shows edit mode when initialData is provided', () => {
    const mockInitialData = {
      id: '1',
      name: 'Test Package',
      price: 100,
    };

    render(
      <PackageDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        initialData={mockInitialData}
      />
    );

    expect(screen.getByText(/Edit Package/i)).toBeInTheDocument();
  });
});