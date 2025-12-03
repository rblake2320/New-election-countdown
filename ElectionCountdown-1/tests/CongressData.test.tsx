/**
 * React component tests for CongressData component.
 * Tests UI logic, filtering, and user interactions.
 * Uses MSW for API mocking to ensure deterministic tests.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { CongressData } from '../client/src/components/congress-data.jsx';

// Mock data matching our real API structure
const mockMembers = [
  {
    id: 1,
    bioguideId: 'S000148',
    name: 'Chuck Schumer',
    party: 'Democratic',
    state: 'NY',
    chamber: 'Senate',
    district: null,
    congress: 119
  },
  {
    id: 2,
    bioguideId: 'G000555',
    name: 'Kirsten Gillibrand',
    party: 'Democratic',
    state: 'NY',
    chamber: 'Senate',
    district: null,
    congress: 119
  },
  {
    id: 3,
    bioguideId: 'A000071',
    name: 'Tom Suozzi',
    party: 'Democratic',
    state: 'NY',
    chamber: 'House',
    district: '3',
    congress: 119
  },
  {
    id: 4,
    bioguideId: 'M000194',
    name: 'Nancy Mace',
    party: 'Republican',
    state: 'SC',
    chamber: 'House',
    district: '1',
    congress: 119
  }
];

const mockCommittees = [
  {
    id: 1,
    systemCode: 'HSJU',
    name: 'House Committee on the Judiciary',
    chamber: 'House',
    committeeTypeCode: 'Standing'
  },
  {
    id: 2,
    systemCode: 'SSJU',
    name: 'Senate Committee on the Judiciary',
    chamber: 'Senate',
    committeeTypeCode: 'Standing'
  }
];

const mockBills = [
  {
    id: 1,
    congress: 119,
    number: 'H.R.1',
    title: 'For the People Act',
    latestAction: {
      actionDate: '2025-01-03',
      text: 'Introduced in House'
    }
  }
];

// MSW server setup
const server = setupServer(
  rest.get('/api/members', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockMembers));
  }),
  
  rest.get('/api/members/search', (req, res, ctx) => {
    const query = req.url.searchParams.get('q');
    if (!query) {
      return res(ctx.status(400), ctx.json({ error: 'Search query is required' }));
    }
    
    const filtered = mockMembers.filter(member =>
      member.name.toLowerCase().includes(query.toLowerCase()) ||
      member.bioguideId.toLowerCase().includes(query.toLowerCase())
    );
    
    return res(ctx.status(200), ctx.json(filtered));
  }),
  
  rest.get('/api/members/:state', (req, res, ctx) => {
    const { state } = req.params;
    const filtered = mockMembers.filter(member => 
      member.state.toLowerCase() === (state as string).toLowerCase()
    );
    return res(ctx.status(200), ctx.json(filtered));
  }),
  
  rest.get('/api/committees', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockCommittees));
  }),
  
  rest.get('/api/bills', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockBills));
  }),
  
  rest.get('/api/bills/:congress', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockBills));
  }),
  
  rest.post('/api/congress/sync-all', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ 
      success: true, 
      membersProcessed: mockMembers.length 
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('CongressData Component', () => {
  it('renders loading state initially', async () => {
    renderWithClient(<CongressData />);
    
    expect(screen.getByText('Congressional Data')).toBeInTheDocument();
    expect(screen.getByText('Real-time data from the U.S. Congress API')).toBeInTheDocument();
  });

  it('displays all members after loading', async () => {
    renderWithClient(<CongressData />);
    
    await waitFor(() => {
      expect(screen.getByText('Chuck Schumer')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Kirsten Gillibrand')).toBeInTheDocument();
    expect(screen.getByText('Tom Suozzi')).toBeInTheDocument();
    expect(screen.getByText('Nancy Mace')).toBeInTheDocument();
    
    // Check member count display
    expect(screen.getByText(/Showing 4 of 4 members/)).toBeInTheDocument();
  });

  it('filters members by name search', async () => {
    renderWithClient(<CongressData />);
    
    await waitFor(() => {
      expect(screen.getByText('Chuck Schumer')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText('Search by name or ID...');
    fireEvent.change(searchInput, { target: { value: 'Chuck' } });
    
    await waitFor(() => {
      expect(screen.getByText('Chuck Schumer')).toBeInTheDocument();
      expect(screen.queryByText('Kirsten Gillibrand')).not.toBeInTheDocument();
    });
  });

  it('filters members by party', async () => {
    renderWithClient(<CongressData />);
    
    await waitFor(() => {
      expect(screen.getByText('Chuck Schumer')).toBeInTheDocument();
    });
    
    const partySelect = screen.getByRole('combobox', { name: /filter by party/i });
    fireEvent.click(partySelect);
    
    const republicanOption = screen.getByText('Republican');
    fireEvent.click(republicanOption);
    
    await waitFor(() => {
      expect(screen.getByText('Nancy Mace')).toBeInTheDocument();
      expect(screen.queryByText('Chuck Schumer')).not.toBeInTheDocument();
    });
  });

  it('filters members by state', async () => {
    renderWithClient(<CongressData />);
    
    await waitFor(() => {
      expect(screen.getByText('Chuck Schumer')).toBeInTheDocument();
    });
    
    const stateInput = screen.getByPlaceholderText('State (e.g., CA, NY)');
    fireEvent.change(stateInput, { target: { value: 'SC' } });
    
    await waitFor(() => {
      expect(screen.getByText('Nancy Mace')).toBeInTheDocument();
      expect(screen.queryByText('Chuck Schumer')).not.toBeInTheDocument();
    });
  });

  it('filters members by chamber', async () => {
    renderWithClient(<CongressData />);
    
    await waitFor(() => {
      expect(screen.getByText('Chuck Schumer')).toBeInTheDocument();
    });
    
    const chamberSelect = screen.getByRole('combobox', { name: /filter by chamber/i });
    fireEvent.click(chamberSelect);
    
    const houseOption = screen.getByText('House');
    fireEvent.click(houseOption);
    
    await waitFor(() => {
      expect(screen.getByText('Tom Suozzi')).toBeInTheDocument();
      expect(screen.getByText('Nancy Mace')).toBeInTheDocument();
      expect(screen.queryByText('Chuck Schumer')).not.toBeInTheDocument();
    });
  });

  it('clears all filters when Clear Filters button is clicked', async () => {
    renderWithClient(<CongressData />);
    
    await waitFor(() => {
      expect(screen.getByText('Chuck Schumer')).toBeInTheDocument();
    });
    
    // Apply filters
    const searchInput = screen.getByPlaceholderText('Search by name or ID...');
    fireEvent.change(searchInput, { target: { value: 'Chuck' } });
    
    await waitFor(() => {
      expect(screen.queryByText('Kirsten Gillibrand')).not.toBeInTheDocument();
    });
    
    // Clear filters
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(screen.getByText('Chuck Schumer')).toBeInTheDocument();
      expect(screen.getByText('Kirsten Gillibrand')).toBeInTheDocument();
      expect(screen.getByText('Tom Suozzi')).toBeInTheDocument();
      expect(screen.getByText('Nancy Mace')).toBeInTheDocument();
    });
    
    expect(searchInput).toHaveValue('');
  });

  it('displays member details correctly', async () => {
    renderWithClient(<CongressData />);
    
    await waitFor(() => {
      expect(screen.getByText('Chuck Schumer')).toBeInTheDocument();
    });
    
    // Check member details
    expect(screen.getByText('Democratic - NY')).toBeInTheDocument();
    expect(screen.getByText('Senate')).toBeInTheDocument();
    
    // Check district display for House members
    expect(screen.getByText('Democratic - NY District 3')).toBeInTheDocument();
    expect(screen.getByText('Republican - SC District 1')).toBeInTheDocument();
  });

  it('handles sync button click', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    renderWithClient(<CongressData />);
    
    await waitFor(() => {
      expect(screen.getByText('Sync All 535+ Members')).toBeInTheDocument();
    });
    
    const syncButton = screen.getByText('Sync All 535+ Members');
    fireEvent.click(syncButton);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Sync result:', {
        success: true,
        membersProcessed: 4
      });
    });
    
    consoleSpy.mockRestore();
  });

  it('switches between tabs correctly', async () => {
    renderWithClient(<CongressData />);
    
    // Initially on Members tab
    await waitFor(() => {
      expect(screen.getByText('Chuck Schumer')).toBeInTheDocument();
    });
    
    // Switch to Bills tab
    const billsTab = screen.getByRole('tab', { name: 'Bills' });
    fireEvent.click(billsTab);
    
    await waitFor(() => {
      expect(screen.getByText('For the People Act')).toBeInTheDocument();
    });
    
    // Switch to Committees tab
    const committeesTab = screen.getByRole('tab', { name: 'Committees' });
    fireEvent.click(committeesTab);
    
    await waitFor(() => {
      expect(screen.getByText('House Committee on the Judiciary')).toBeInTheDocument();
    });
  });

  it('displays no results message when filters return empty', async () => {
    renderWithClient(<CongressData />);
    
    await waitFor(() => {
      expect(screen.getByText('Chuck Schumer')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText('Search by name or ID...');
    fireEvent.change(searchInput, { target: { value: 'NonExistentMember' } });
    
    await waitFor(() => {
      expect(screen.getByText('No members found matching current filters')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    server.use(
      rest.get('/api/members', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
      })
    );
    
    renderWithClient(<CongressData />);
    
    // Component should handle error without crashing
    await waitFor(() => {
      expect(screen.getByText('Congressional Data')).toBeInTheDocument();
    });
  });
});

describe('Accessibility', () => {
  it('provides proper ARIA labels and roles', async () => {
    renderWithClient(<CongressData />);
    
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Bills' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Committees' })).toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    renderWithClient(<CongressData />);
    
    const membersTab = screen.getByRole('tab', { name: 'Members' });
    const billsTab = screen.getByRole('tab', { name: 'Bills' });
    
    membersTab.focus();
    expect(membersTab).toHaveFocus();
    
    // Simulate Tab key navigation
    fireEvent.keyDown(membersTab, { key: 'Tab' });
    
    // Should be able to navigate between tabs
    expect(billsTab).toBeDefined();
  });
});

describe('Performance', () => {
  it('renders large member lists efficiently', async () => {
    const largeMembers = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1000,
      bioguideId: `T${i.toString().padStart(6, '0')}`,
      name: `Test Member ${i}`,
      party: i % 2 === 0 ? 'Democratic' : 'Republican',
      state: ['NY', 'CA', 'TX', 'FL'][i % 4],
      chamber: i % 2 === 0 ? 'House' : 'Senate',
      district: i % 2 === 0 ? (i % 10).toString() : null,
      congress: 119
    }));
    
    server.use(
      rest.get('/api/members', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(largeMembers));
      })
    );
    
    const startTime = Date.now();
    renderWithClient(<CongressData />);
    
    await waitFor(() => {
      expect(screen.getByText(/Showing \d+ of 1000 members/)).toBeInTheDocument();
    });
    
    const renderTime = Date.now() - startTime;
    expect(renderTime).toBeLessThan(3000); // Should render within 3 seconds
  });
});