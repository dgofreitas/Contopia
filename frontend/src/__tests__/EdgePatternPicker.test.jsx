// Contopia — EdgePatternPicker Component Tests (STORY-026)
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EdgePatternPicker from '../app/cover/EdgePatternPicker';
import { useCoverStore } from '../stores/cover-store';
import { EDGE_PATTERNS } from '../lib/edge-patterns';

describe('EdgePatternPicker', () => {
  beforeEach(() => {
    useCoverStore.getState().resetStore();
  });

  it('renders heading from i18n', () => {
    render(<EdgePatternPicker />);
    expect(screen.getByText('cover.edge.patternHeading')).toBeInTheDocument();
  });

  it('renders all 5 pattern options', () => {
    render(<EdgePatternPicker />);
    const radiogroup = screen.getByRole('radiogroup');
    const buttons = within(radiogroup).getAllByRole('button');
    expect(buttons).toHaveLength(EDGE_PATTERNS.length);
  });

  it('renders pattern labels from i18n', () => {
    render(<EdgePatternPicker />);
    EDGE_PATTERNS.forEach((pattern) => {
      expect(screen.getByText(pattern.nameKey)).toBeInTheDocument();
    });
  });

  it('has role="radiogroup" with aria-label', () => {
    render(<EdgePatternPicker />);
    const radiogroup = screen.getByRole('radiogroup');
    expect(radiogroup).toHaveAttribute('aria-label', 'cover.aria.edgePatternPickerGroup');
  });

  it('default "solid" pattern is pre-selected', () => {
    render(<EdgePatternPicker />);
    const radiogroup = screen.getByRole('radiogroup');
    const buttons = within(radiogroup).getAllByRole('button');
    const solidBtn = buttons.find((b) => b.getAttribute('aria-pressed') === 'true');
    expect(solidBtn).toBeTruthy();
  });

  it('clicking a pattern updates store edgePattern', async () => {
    const user = userEvent.setup();
    render(<EdgePatternPicker />);
    const radiogroup = screen.getByRole('radiogroup');
    const buttons = within(radiogroup).getAllByRole('button');
    // Click the second button (gradient)
    await user.click(buttons[1]);
    expect(useCoverStore.getState().edgePattern).toBe(EDGE_PATTERNS[1].id);
  });

  it('selected pattern updates aria-pressed', async () => {
    const user = userEvent.setup();
    const { unmount: firstUnmount } = render(<EdgePatternPicker />);
    const buttons = screen.getAllByRole('button');

    // Click chevron (last pattern button)
    await user.click(buttons[buttons.length - 1]);
    expect(useCoverStore.getState().edgePattern).toBe('chevron');

    // Unmount first render
    firstUnmount();

    // Re-render to verify press state
    const { unmount: secondUnmount } = render(<EdgePatternPicker />);
    const newButtons = screen.getAllByRole('button');
    const selectedBtn = newButtons.find((b) => b.getAttribute('aria-pressed') === 'true');
    expect(selectedBtn).toBeTruthy();
    expect(selectedBtn.getAttribute('aria-label')).toBe(EDGE_PATTERNS[4].nameKey);
    secondUnmount();
  });

  it('each pattern button shows mini edge preview with CSS class', () => {
    render(<EdgePatternPicker />);
    const radiogroup = screen.getByRole('radiogroup');
    const buttons = within(radiogroup).getAllByRole('button');
    EDGE_PATTERNS.forEach((pattern, index) => {
      const btn = buttons[index];
      expect(btn.className).toContain(pattern.cssClass);
    });
  });

  it('patterns have cover-edge-swatch class', () => {
    render(<EdgePatternPicker />);
    const radiogroup = screen.getByRole('radiogroup');
    const buttons = within(radiogroup).getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn.className).toContain('cover-edge-swatch');
    });
  });

  it('selected pattern gets cover-edge-swatch--selected class', async () => {
    const user = userEvent.setup();
    const { unmount: firstUnmount } = render(<EdgePatternPicker />);
    const buttons = screen.getAllByRole('button');

    // Initially solid is selected
    expect(buttons[0].className).toContain('cover-edge-swatch--selected');

    // Click marbling
    await user.click(buttons[2]);

    firstUnmount();

    // Re-render to get updated classes
    const { unmount: secondUnmount } = render(<EdgePatternPicker />);
    const newButtons = screen.getAllByRole('button');
    expect(newButtons[2].className).toContain('cover-edge-swatch--selected');
    expect(newButtons[0].className).not.toContain('cover-edge-swatch--selected');
    secondUnmount();
  });
});
