// Contopia — CoverDesignerActions Component Tests (STORY-022)
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CoverDesignerActions from '../app/cover/CoverDesignerActions';

describe('CoverDesignerActions', () => {
  describe('rendering', () => {
    it('renders skip button', () => {
      render(<CoverDesignerActions onSkip={vi.fn()} onCustomize={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'actions.skip' })).toBeInTheDocument();
    });

    it('renders customize button', () => {
      render(<CoverDesignerActions onSkip={vi.fn()} onCustomize={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'actions.customize' })).toBeInTheDocument();
    });

    it('skip button has aria-label matching its text', () => {
      render(<CoverDesignerActions onSkip={vi.fn()} onCustomize={vi.fn()} />);
      const skipBtn = screen.getByRole('button', { name: 'actions.skip' });
      expect(skipBtn).toHaveAttribute('aria-label', 'actions.skip');
    });
  });

  describe('hasSelection behavior', () => {
    it('customize button is disabled when hasSelection is false', () => {
      render(<CoverDesignerActions onSkip={vi.fn()} onCustomize={vi.fn()} hasSelection={false} />);
      const customizeBtn = screen.getByRole('button', { name: 'actions.customize' });
      expect(customizeBtn).toBeDisabled();
    });

    it('customize button is enabled when hasSelection is true', () => {
      render(<CoverDesignerActions onSkip={vi.fn()} onCustomize={vi.fn()} hasSelection={true} />);
      const customizeBtn = screen.getByRole('button', { name: 'actions.customize' });
      expect(customizeBtn).not.toBeDisabled();
    });

    it('customize button has disabled styles when hasSelection is false', () => {
      render(<CoverDesignerActions onSkip={vi.fn()} onCustomize={vi.fn()} hasSelection={false} />);
      const customizeBtn = screen.getByRole('button', { name: 'actions.customize' });
      expect(customizeBtn.className).toContain('cursor-not-allowed');
    });

    it('customize button has blue styles when hasSelection is true', () => {
      render(<CoverDesignerActions onSkip={vi.fn()} onCustomize={vi.fn()} hasSelection={true} />);
      const customizeBtn = screen.getByRole('button', { name: 'actions.customize' });
      expect(customizeBtn.className).toContain('bg-blue-600');
      expect(customizeBtn.className).toContain('text-white');
    });
  });

  describe('interactions', () => {
    it('calls onSkip when skip button clicked', () => {
      const onSkip = vi.fn();
      render(<CoverDesignerActions onSkip={onSkip} onCustomize={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'actions.skip' }));
      expect(onSkip).toHaveBeenCalledTimes(1);
    });

    it('calls onCustomize when customize button clicked and hasSelection is true', () => {
      const onCustomize = vi.fn();
      render(<CoverDesignerActions onSkip={vi.fn()} onCustomize={onCustomize} hasSelection={true} />);
      fireEvent.click(screen.getByRole('button', { name: 'actions.customize' }));
      expect(onCustomize).toHaveBeenCalledTimes(1);
    });

    it('does not call onCustomize when customize button clicked and hasSelection is false', () => {
      const onCustomize = vi.fn();
      render(<CoverDesignerActions onSkip={vi.fn()} onCustomize={onCustomize} hasSelection={false} />);
      fireEvent.click(screen.getByRole('button', { name: 'actions.customize' }));
      expect(onCustomize).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('hasSelection defaults to false when not provided', () => {
      render(<CoverDesignerActions onSkip={vi.fn()} onCustomize={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'actions.customize' })).toBeDisabled();
    });

    it('skip button is always enabled', () => {
      render(<CoverDesignerActions onSkip={vi.fn()} onCustomize={vi.fn()} hasSelection={false} />);
      expect(screen.getByRole('button', { name: 'actions.skip' })).not.toBeDisabled();
    });
  });
});
