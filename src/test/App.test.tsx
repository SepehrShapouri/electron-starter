import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// Simple component test
const TestComponent = () => <div>Hello Vitest</div>;

describe('Vitest Setup', () => {
  it('renders a simple component', () => {
    render(<TestComponent />);
    expect(screen.getByText('Hello Vitest')).toBeInTheDocument();
  });

  it('performs basic math', () => {
    expect(2 + 2).toBe(4);
  });
});
