import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Input, Select, Card, Badge, Tooltip } from './index';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Accessible Core Reusable Components', () => {
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

  test('Button renders with id, class, and triggers onClick', () => {
    const handleClick = jest.fn();
    act(() => {
      root.render(<Button id="test-btn" className="custom-btn" onClick={handleClick}>Click Me</Button>);
    });
    const btn = container.querySelector('#test-btn');
    expect(btn).not.toBeNull();
    expect(btn.className).toContain('custom-btn');
    act(() => btn.click());
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('Input renders with accessible label and aria-invalid on error', () => {
    act(() => {
      root.render(<Input id="email-in" label="Email Address" error="Required field" value="" onChange={() => {}} />);
    });
    const input = container.querySelector('#email-in');
    expect(input).not.toBeNull();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(container.textContent).toContain('Required field');
  });

  test('Select renders options and accessible helperText', () => {
    act(() => {
      root.render(
        <Select id="role-sel" label="Role" helperText="Select permission" value="admin" onChange={() => {}}
          options={[{ value: 'admin', label: 'Administrator' }]} />
      );
    });
    const select = container.querySelector('#role-sel');
    expect(select).not.toBeNull();
    expect(container.textContent).toContain('Select permission');
  });

  test('Card renders title, content, and footer', () => {
    act(() => {
      root.render(
        <Card id="test-card" title="Overview" footer={<span>Card Footer</span>}>
          <p>Card Body</p>
        </Card>
      );
    });
    expect(container.textContent).toContain('Overview');
    expect(container.textContent).toContain('Card Body');
    expect(container.textContent).toContain('Card Footer');
  });

  test('Badge and Tooltip render cleanly', () => {
    act(() => {
      root.render(
        <Badge id="test-badge" variant="success" dot>
          <Tooltip id="tip-test" text="Helpful info"><span>Active</span></Tooltip>
        </Badge>
      );
    });
    expect(container.textContent).toContain('Active');
  });
});
