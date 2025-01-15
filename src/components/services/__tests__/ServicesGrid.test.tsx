import { render, screen, fireEvent } from '@testing-library/react';
import { ServicesGrid } from '../ServicesGrid';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        data: [
          {
            id: '1',
            name: 'Test Service',
            original_price: 100,
            selling_price: 80,
            duration: 60,
            categories: []
          }
        ],
        error: null
      })
    })
  }
}));

describe('ServicesGrid', () => {
  const queryClient = new QueryClient();
  const defaultProps = {
    searchQuery: '',
    onEdit: vi.fn()
  };

  const renderComponent = (props = defaultProps) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ServicesGrid {...props} />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient.clear();
  });

  it('renders services grid correctly', async () => {
    renderComponent();
    
    // Wait for the service to appear
    const serviceName = await screen.findByText('Test Service');
    expect(serviceName).toBeInTheDocument();
  });

  it('filters services based on search query', async () => {
    renderComponent({ ...defaultProps, searchQuery: 'Test' });
    
    const serviceName = await screen.findByText('Test Service');
    expect(serviceName).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();
    renderComponent({ ...defaultProps, onEdit });
    
    const editButton = await screen.findByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    
    expect(onEdit).toHaveBeenCalled();
  });
});