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
            data: { id: '1' },
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
    queryClient.clear();
  });

  it('renders dialog when open', () => {
    renderComponent();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows correct title for create mode', () => {
    renderComponent();
    expect(screen.getByText('Create Service')).toBeInTheDocument();
  });

  it('shows correct title for edit mode', () => {
    renderComponent({
      ...defaultProps,
      initialData: {
        id: '1',
        name: 'Test Service'
      }
    });
    expect(screen.getByText('Edit Service')).toBeInTheDocument();
  });

  it('closes dialog when cancel is clicked', () => {
    const onOpenChange = vi.fn();
    renderComponent({ ...defaultProps, onOpenChange });
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});