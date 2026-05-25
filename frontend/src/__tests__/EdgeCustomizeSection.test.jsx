// Contopia — EdgeCustomizeSection Component Tests (STORY-026)
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EdgeCustomizeSection from '../app/cover/EdgeCustomizeSection';
import { useCoverStore } from '../stores/cover-store';

function renderSection(title = 'My Book') {
  return render(<EdgeCustomizeSection title={title} />);
}

describe('EdgeCustomizeSection', () => {
  beforeEach(() => {
    useCoverStore.getState().resetStore();
  });

  it('renders heading Edge from i18n', () => {
    renderSection();
    expect(screen.getByText('cover.edge.sectionHeading')).toBeInTheDocument();
  });

  it('shows EdgePreview and EdgeToggle', () => {
    const { container } = renderSection();
    expect(container.querySelector('.cover-edge-preview')).toBeInTheDocument();
    expect(screen.getByText('cover.edge.toggleLabel')).toBeInTheDocument();
  });

  it('when toggle is off, EdgeColorPicker is NOT in the document', () => {
    useCoverStore.getState().setEdgeCustomized(false);
    renderSection();
    expect(screen.queryByRole('group', { name: /edgeColorPickerGroup/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('when toggle is on, EdgeColorPicker IS in the document', () => {
    useCoverStore.getState().setEdgeCustomized(true);
    renderSection();
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('when toggle is on, EdgePatternPicker IS in the document', () => {
    useCoverStore.getState().setEdgeCustomized(true);
    renderSection();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('toggle on then off hides color and pattern pickers', async () => {
    const user = userEvent.setup();
    useCoverStore.getState().setEdgeCustomized(false);
    renderSection();

    // Initially off - no pickers
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();

    // Click the toggle label
    await user.click(screen.getByText('cover.edge.toggleLabel'));

    // After clicking, EdgeCustomized becomes true, pickers should appear
    expect(useCoverStore.getState().edgeCustomized).toBe(true);
  });

  it('preview updates when edge pattern changes', () => {
    useCoverStore.getState().setEdgeCustomized(true);
    useCoverStore.getState().setEdgePattern('marbling');
    const { container } = renderSection();
    const edge = container.querySelector('.cover-edge-preview');
    expect(edge).toBeInTheDocument();
    expect(edge).toHaveClass('cover-edge--marbling');
  });

  it('preview updates when edge color changes', () => {
    useCoverStore.getState().setEdgeCustomized(true);
    useCoverStore.getState().setEdgeColor('#FF6B6B');
    const { container } = renderSection();
    const edge = container.querySelector('.cover-edge-preview');
    expect(edge).toBeInTheDocument();
    expect(edge.style.getPropertyValue('--edge-color')).toBe('#FF6B6B');
  });

  it('renders EdgePatternPicker heading when customized', () => {
    useCoverStore.getState().setEdgeCustomized(true);
    renderSection();
    expect(screen.getByText('cover.edge.patternHeading')).toBeInTheDocument();
  });
});
