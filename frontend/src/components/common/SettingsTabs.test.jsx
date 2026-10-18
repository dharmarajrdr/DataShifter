import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import SettingsTabs from './SettingsTabs';

global.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/settings/org' }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { orgOwner: true },
    hasPermission: () => true,
  }),
}));

describe('SettingsTabs', () => {
  let container = null, root = null;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockNavigate.mockClear();
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); container = null; });

  test('renders title, subtitle, and tabs without overflow-x-auto', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <SettingsTabs title="Test Settings" subtitle="Test Subtitle" />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Test Settings');
    expect(container.textContent).toContain('Test Subtitle');

    const tabsList = container.querySelector('#settings-tabs-list');
    expect(tabsList).not.toBeNull();
    expect(tabsList.className).not.toContain('overflow-x-auto');

    const generalTab = container.querySelector('#tab-general-profile');
    expect(generalTab).not.toBeNull();
  });

  test('navigates when tab clicked', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <SettingsTabs />
        </MemoryRouter>
      );
    });

    const membersTab = container.querySelector('#tab-members');
    expect(membersTab).not.toBeNull();
    act(() => { membersTab.click(); });
    expect(mockNavigate).toHaveBeenCalledWith('/settings/members');
  });
});
