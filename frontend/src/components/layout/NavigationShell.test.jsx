import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header/Header';
import { MarketplacePlaceholder } from '../../pages/marketplace/MarketplacePlaceholder';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { fullName: 'Test User', displayInitials: 'TU', roleName: 'Admin', orgName: 'DataShifter' },
    organizations: [{ orgId: 'org-1', orgName: 'DataShifter' }],
    switchOrg: jest.fn(),
  }),
}));

jest.mock('../../services/authApi', () => ({
  authApi: {
    myInvitations: jest.fn(() => Promise.resolve({ data: [] })),
    handleInvitation: jest.fn(() => Promise.resolve({})),
    me: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

describe('Modern Navigation Shell & Minimal Header Layout', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    container = null;
  });

  test('Sidebar renders expanded with nav items and toggles collapse state', () => {
    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/marketplace']}>
          <Sidebar id="test-sidebar" />
        </MemoryRouter>
      );
    });

    const sidebar = container.querySelector('#test-sidebar');
    expect(sidebar).not.toBeNull();
    expect(sidebar.className).toContain('w-60');

    // Verify marketplace and udfs nav items exist
    expect(container.textContent).toContain('Marketplace');
    expect(container.textContent).toContain('Library');

    // Click collapse toggle button
    const toggleBtn = container.querySelector('#sidebar-collapse-toggle');
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');

    act(() => toggleBtn.click());

    expect(sidebar.className).toContain('w-16');
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
  });

  test('Header renders minimal breadcrumbs and page actions', () => {
    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/marketplace']}>
          <Header id="test-header" actions={<button id="test-action">Action</button>} />
        </MemoryRouter>
      );
    });

    const header = container.querySelector('#test-header');
    expect(header).not.toBeNull();
    expect(container.textContent).toContain('App');
    expect(container.textContent).toContain('Marketplace');
    expect(container.querySelector('#test-action')).not.toBeNull();
  });

  test('MarketplacePlaceholder renders with id, class, heading and badge', () => {
    act(() => {
      root.render(<MarketplacePlaceholder id="test-marketplace" className="test-class" />);
    });

    const page = container.querySelector('#test-marketplace');
    expect(page).not.toBeNull();
    expect(page.className).toContain('test-class');
    expect(container.querySelector('#marketplace-heading').textContent).toContain('Adapter Marketplace');
    expect(container.querySelector('#marketplace-phase-badge')).not.toBeNull();
  });
});
