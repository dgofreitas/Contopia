import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EmptyShelfState from '../components/shelf/EmptyShelfState';

// setup.js already mocks react-i18next to pass through keys

function renderWithRouter(ui) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('EmptyShelfState', () => {
  it('renders with role="status"', () => {
    renderWithRouter(<EmptyShelfState />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the empty title via i18n key', () => {
    renderWithRouter(<EmptyShelfState />);
    expect(screen.getByText('emptyTitle')).toBeInTheDocument();
  });

  it('renders the create book button with aria-label', () => {
    renderWithRouter(<EmptyShelfState />);
    expect(screen.getByRole('button', { name: 'createBook' })).toBeInTheDocument();
  });

  it('has aria-live="polite"', () => {
    renderWithRouter(<EmptyShelfState />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
  });
});
