import { render, screen, fireEvent } from '@testing-library/react';
import { PackageForm } from '../PackageForm';
import { FormProvider, useForm } from 'react-hook-form';
import { vi } from 'vitest';

// Mock the components and hooks
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      { id: '1', name: 'Service 1', selling_price: 100 },
      { id: '2', name: 'Service 2', selling_price: 200 },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
      }),
    },
  },
}));

const MockFormProvider = ({ children }: { children: React.ReactNode }) => {
  const methods = useForm();
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('PackageForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with all required fields', () => {
    render(
      <MockFormProvider>
        <PackageForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      </MockFormProvider>
    );

    expect(screen.getByLabelText(/Package Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByText(/Status/i)).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    render(
      <MockFormProvider>
        <PackageForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      </MockFormProvider>
    );

    const submitButton = screen.getByRole('button', { name: /Create Package/i });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/Package name is required/i)).toBeInTheDocument();
  });

  it('calls onSubmit with form data when valid', async () => {
    render(
      <MockFormProvider>
        <PackageForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      </MockFormProvider>
    );

    const nameInput = screen.getByLabelText(/Package Name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Package' } });

    const submitButton = screen.getByRole('button', { name: /Create Package/i });
    fireEvent.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <MockFormProvider>
        <PackageForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      </MockFormProvider>
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});