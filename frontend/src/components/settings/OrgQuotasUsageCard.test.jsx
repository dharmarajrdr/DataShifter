import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import OrgQuotasUsageCard from './OrgQuotasUsageCard';
import { authApi } from '../../services/authApi';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('OrgQuotasUsageCard dynamic quotas', () => {
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
    jest.restoreAllMocks();
  });

  test('fetches and renders dynamic plan usage and quotas', async () => {
    const mockData = {
      planName: 'Pro Tier',
      quotas: [
        { key: 'pipelines', label: 'Custom Pipelines', current: '7', max: '20', pct: 35, color: 'bg-indigo-600' },
        { key: 'connections', label: 'Custom Connections', current: '5', max: '10', pct: 50, color: 'bg-indigo-600' },
        { key: 'rows', label: 'Custom Migrated Rows', current: '12.5M', max: '50M', pct: 25, color: 'bg-emerald-600' },
      ],
    };
    jest.spyOn(authApi, 'getOrgQuotas').mockResolvedValue({ status: 200, message: 'Success', data: mockData });

    await act(async () => {
      root.render(<MemoryRouter><OrgQuotasUsageCard /></MemoryRouter>);
    });

    expect(authApi.getOrgQuotas).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Pro Tier');
    expect(container.textContent).toContain('Custom Pipelines');
    expect(container.textContent).toContain('7 / 20');
    expect(container.textContent).toContain('Custom Connections');
    expect(container.textContent).toContain('5 / 10');
    expect(container.textContent).toContain('Custom Migrated Rows');
    expect(container.textContent).toContain('12.5M / 50M');
  });

  test('handles fetch failure and allows retry', async () => {
    const spy = jest.spyOn(authApi, 'getOrgQuotas')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        status: 200,
        data: { planName: 'Free', quotas: [{ key: 'pipelines', label: 'Pipelines', current: '1', max: '2', pct: 50 }] },
      });

    await act(async () => {
      root.render(<MemoryRouter><OrgQuotasUsageCard /></MemoryRouter>);
    });

    expect(container.textContent).toContain('Network error');
    const retryBtn = container.querySelector('button');
    expect(retryBtn.textContent).toBe('Retry');

    await act(async () => {
      retryBtn.click();
    });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('Free');
    expect(container.textContent).toContain('1 / 2');
  });
});
