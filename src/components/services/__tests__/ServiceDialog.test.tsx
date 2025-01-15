import { render, screen, fireEvent } from '@testing-library/react';
import { ServiceDialog } from '../ServiceDialog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: () => ({
            data: { id: '1', name: 'Test Service' },
            error: null
          })
        })
      }),
      update: () => ({
        eq: () => ({
          data: null,
          error: null
        })
      }),
      delete: () => ({
        eq: () => ({
          data: null,
          error: null
        })
      })
    })
  }
}));

describe('ServiceDialog', () => {
  const queryClient = new QueryClient();
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    initialData: undefined
  };

  const renderComponent = (props = defaultProps) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ServiceDialog {...props} />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderComponent();
    expect(screen.getByText(/create service/i)).toBeInTheDocument();
  });

  it('shows edit mode when initialData is provided', () => {
    renderComponent({
      ...defaultProps,
      initialData: {
        id: '1',
        name: 'Test Service',
        original_price: 100,
        selling_price: 80,
        duration: 60
      }
    });
    expect(screen.getByText(/edit service/i)).toBeInTheDocument();
  });

  it('calls onOpenChange when dialog is closed', () => {
    const onOpenChange = vi.fn();
    renderComponent({ ...defaultProps, onOpenChange });
    
    const closeButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(closeButton);
    
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});