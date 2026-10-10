import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ForbiddenPage, NotFoundPage, ServerErrorPage, ErrorPage } from './ErrorPage';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Reusable Error Pages', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    container = null;
  });

  test('renders 403 ForbiddenPage with default title and badge', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <ForbiddenPage />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('403 FORBIDDEN');
    expect(container.textContent).toContain('Access denied');
  });

  test('renders 403 ForbiddenPage with missing permission', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <ForbiddenPage missingPermission="settings:edit" message="Cannot edit settings" />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Cannot edit settings');
    expect(container.textContent).toContain('settings:edit');
    expect(container.textContent).toContain('Required permission:');
  });

  test('renders 404 NotFoundPage with default badge and title', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <NotFoundPage />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('404 NOT FOUND');
    expect(container.textContent).toContain('Page not found');
  });

  test('renders 500 ServerErrorPage with retry button and triggers callback', () => {
    const handleRetry = jest.fn();
    act(() => {
      root.render(
        <MemoryRouter>
          <ServerErrorPage onRetry={handleRetry} message="Database timeout" />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('500 SERVER ERROR');
    expect(container.textContent).toContain('Internal server error');
    expect(container.textContent).toContain('Database timeout');

    const retryButton = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent === 'Try again'
    );
    expect(retryButton).not.toBeNull();
    act(() => {
      retryButton.click();
    });
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  test('renders technical error details when provided', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <ErrorPage status={500} details="NullPointerException at Line 42" />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Show error details');
    const detailsToggle = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent.includes('Show error details')
    );
    expect(detailsToggle).not.toBeNull();
    act(() => {
      detailsToggle.click();
    });
    expect(container.textContent).toContain('NullPointerException at Line 42');
  });
});
