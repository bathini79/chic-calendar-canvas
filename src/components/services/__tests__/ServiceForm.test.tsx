import { render, screen, fireEvent } from '@testing-library/react';
import { ServiceForm } from '../ServiceForm';
import { vi, describe, it, expect } from 'vitest';

describe('ServiceForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn()
  };

  it('renders form fields correctly', () => {
    render(<ServiceForm {...defaultProps} />);
    
    expect(screen.getByLabelText(/service name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/categories/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/original price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/selling price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
  });

  it('submits form with correct data', async () => {
    const onSubmit = vi.fn();
    render(<ServiceForm {...defaultProps} onSubmit={onSubmit} />);
    
    const nameInput = screen.getByLabelText(/service name/i);
    const originalPriceInput = screen.getByLabelText(/original price/i);
    const sellingPriceInput = screen.getByLabelText(/selling price/i);
    const durationInput = screen.getByLabelText(/duration/i);
    
    fireEvent.change(nameInput, { target: { value: 'Test Service' } });
    fireEvent.change(originalPriceInput, { target: { value: '100' } });
    fireEvent.change(sellingPriceInput, { target: { value: '80' } });
    fireEvent.change(durationInput, { target: { value: '60' } });
    
    const submitButton = screen.getByRole('button', { name: /create service/i });
    fireEvent.click(submitButton);
    
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test Service',
      original_price: 100,
      selling_price: 80,
      duration: 60
    }));
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ServiceForm {...defaultProps} onCancel={onCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('pre-fills form with initial data', () => {
    const initialData = {
      name: 'Test Service',
      original_price: 100,
      selling_price: 80,
      duration: 60,
      categories: []
    };
    
    render(<ServiceForm {...defaultProps} initialData={initialData} />);
    
    expect(screen.getByLabelText(/service name/i)).toHaveValue('Test Service');
    expect(screen.getByLabelText(/original price/i)).toHaveValue(100);
    expect(screen.getByLabelText(/selling price/i)).toHaveValue(80);
    expect(screen.getByLabelText(/duration/i)).toHaveValue(60);
  });
});