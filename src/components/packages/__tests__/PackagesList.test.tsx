import { render, screen } from '@testing-library/react';
import { PackagesList } from '../PackagesList';
import { vi } from 'vitest';

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      {
        id: '1',
        name: 'Package 1',
        description: 'Description 1',
        price: 100,
        package_services: [
          { service: { id: '1', name: 'Service 1' } },
        ],
      },
      {
        id: '2',
        name: 'Package 2',
        description: 'Description 2',
        price: 200,
        package_services: [
          { service: { id: '2', name: 'Service 2' } },
        ],
      },
    ],
    isLoading: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

describe('PackagesList', () => {
  const mockOnEdit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders packages list with correct data', () => {
    render(<PackagesList searchQuery="" onEdit={mockOnEdit} />);

    expect(screen.getByText('Package 1')).toBeInTheDocument();
    expect(screen.getByText('Package 2')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
    expect(screen.getByText('Description 2')).toBeInTheDocument();
  });

  it('filters packages based on search query', () => {
    render(<PackagesList searchQuery="Package 1" onEdit={mockOnEdit} />);

    expect(screen.getByText('Package 1')).toBeInTheDocument();
    expect(screen.queryByText('Package 2')).not.toBeInTheDocument();
  });

  it('displays loading state when data is loading', () => {
    vi.mocked('@tanstack/react-query').useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
    });

    render(<PackagesList searchQuery="" onEdit={mockOnEdit} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});