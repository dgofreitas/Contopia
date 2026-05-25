import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SpineCustomizeSection from '../app/cover/SpineCustomizeSection';
import { useCoverStore } from '../stores/cover-store';

function renderSection(title = 'My Book') {
  return render(<SpineCustomizeSection title={title} />);
}

describe('SpineCustomizeSection', () => {
  beforeEach(() => {
    useCoverStore.getState().resetStore();
  });

  it('renders heading Spine/Lombada', () => {
    renderSection();
    expect(screen.getByText('cover.spine.sectionHeading')).toBeInTheDocument();
  });

  it('shows SpinePreview and SpineToggle', () => {
    const { container } = renderSection();
    expect(container.querySelector('.cover-spine-preview')).toBeInTheDocument();
    expect(screen.getByText('cover.spine.toggleLabel')).toBeInTheDocument();
  });

  it('when toggle is off, SpineColorPicker is NOT in the document', () => {
    useCoverStore.getState().setSpineCustomized(false);
    renderSection();
    expect(screen.queryByRole('group', { name: /spineColorPickerGroup/i })).not.toBeInTheDocument();
  });

  it('when toggle is on, SpineColorPicker IS in the document', () => {
    useCoverStore.getState().setSpineCustomized(true);
    renderSection();
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('preview updates when spine color changes', () => {
    useCoverStore.getState().setSpineCustomized(true);
    useCoverStore.getState().setSpineColor('#FF6B6B');
    const { container } = renderSection();
    const spine = container.querySelector('.cover-spine-preview');
    expect(spine).toBeInTheDocument();
    expect(spine.style.backgroundColor).toBe('rgb(255, 107, 107)');
  });
});