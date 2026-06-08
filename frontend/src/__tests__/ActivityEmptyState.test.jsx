import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivityEmptyState from '../components/parent/ActivityEmptyState';

describe('ActivityEmptyState', () => {
  it('renders child name in empty state message', () => {
    render(<ActivityEmptyState childFirstName="Julia" />);

    expect(screen.getByText(/Julia está apenas começando!/)).toBeInTheDocument();
  });

  it('renders fallback message without name', () => {
    render(<ActivityEmptyState childFirstName="" />);

    expect(screen.getByText(/Sua criança está apenas começando!/)).toBeInTheDocument();
  });

  it('renders follow-up text', () => {
    render(<ActivityEmptyState childFirstName="Julia" />);

    expect(screen.getByText('Volte em breve.')).toBeInTheDocument();
  });

  it('has data-testid for identification', () => {
    render(<ActivityEmptyState childFirstName="Julia" />);

    expect(screen.getByTestId('activity-empty-state')).toBeInTheDocument();
  });
});