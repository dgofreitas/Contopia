// Contopia — CoverSticker Component Tests (STORY-024 §7.5)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CoverSticker from '../app/cover/CoverSticker';
import { useCoverStore } from '../stores/cover-store';

// Polyfill PointerEvent for jsdom
if (!global.PointerEvent) {
  class PointerEvent extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init);
      Object.defineProperty(this, 'pointerId', {
        value: init.pointerId ?? 1,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(this, 'clientX', {
        value: init.clientX ?? 0,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(this, 'clientY', {
        value: init.clientY ?? 0,
        writable: true,
        configurable: true,
      });
    }
  }
  global.PointerEvent = PointerEvent;
}

describe('CoverSticker', () => {
  beforeEach(() => {
    useCoverStore.getState().resetStore();
  });

  // Mock useTranslation to return predictable aria-label with position values
  vi.mock('react-i18next', () => ({
    useTranslation: () => ({
      t: (key, opts = {}) => {
        if (key === 'cover.aria.stickerAriaLabel') {
          const name = opts.name ?? 'unknown';
          const x = opts.x ?? 0;
          const y = opts.y ?? 0;
          return `Star sticker, ${x}% from left, ${y}% from top`;
        }
        return key;
      },
    }),
    Trans: ({ children }) => children,
    initReactI18next: { type: '3rdParty', init: vi.fn() },
  }));

  function addStickerToStore(svgId = 'star', overrides = {}) {
    useCoverStore.getState().addSticker(svgId);
    const all = useCoverStore.getState().stickers;
    const s = all[all.length - 1];
    // Apply overrides
    if (Object.keys(overrides).length > 0) {
      const merged = { ...s, ...overrides };
      useCoverStore.getState().setStoreStickers(
        all.map(st => st.id === s.id ? merged : st)
      );
      return merged;
    }
    return s;
  }

  function renderSticker(sticker, textColor = '#000000') {
    return render(
      <div data-sticker-layer style={{ width: '400px', height: '600px', position: 'relative' }}>
        <CoverSticker sticker={sticker} textColor={textColor} />
      </div>
    );
  }

  it('renders the SVG component from sticker library', () => {
    const sticker = addStickerToStore('star');
    const { container } = renderSticker(sticker);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has role="button"', () => {
    const sticker = addStickerToStore('star');
    renderSticker(sticker);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has tabIndex={0}', () => {
    const sticker = addStickerToStore('star');
    renderSticker(sticker);
    expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '0');
  });

  it('has aria-label with sticker name and position', () => {
    const sticker = addStickerToStore('star', { x: 30, y: 60 });
    renderSticker(sticker);
    const el = screen.getByRole('button');
    expect(el).toHaveAttribute('aria-label');
    expect(el.getAttribute('aria-label')).toContain('30');
    expect(el.getAttribute('aria-label')).toContain('60');
  });

  it('has aria-pressed when is the selected sticker', () => {
    const sticker = addStickerToStore('star');
    useCoverStore.getState().selectSticker(sticker.id);
    renderSticker(sticker);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not have aria-pressed when another sticker is selected', () => {
    const sticker = addStickerToStore('star');
    useCoverStore.getState().selectSticker('other-id');
    renderSticker(sticker);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('positions sticker using left and top percentages', () => {
    const sticker = addStickerToStore('star', { x: 25, y: 75 });
    const { container } = renderSticker(sticker);
    const stickerEl = container.querySelector('.cover-sticker');
    expect(stickerEl).toHaveStyle({ left: '25%', top: '75%' });
  });

  it('applies scale transform', () => {
    const sticker = addStickerToStore('star', { scale: 1.5 });
    const { container } = renderSticker(sticker);
    const stickerEl = container.querySelector('.cover-sticker');
    expect(stickerEl.style.transform).toContain('scale(1.5)');
  });

  it('has ring class when selected', () => {
    const sticker = addStickerToStore('star');
    useCoverStore.getState().selectSticker(sticker.id);
    const { container } = renderSticker(sticker);
    const stickerEl = container.querySelector('.cover-sticker');
    expect(stickerEl.className).toContain('ring-2');
  });

  it('selects sticker on focus', () => {
    const sticker = addStickerToStore('star');
    renderSticker(sticker);
    screen.getByRole('button').focus();
    expect(useCoverStore.getState().selectedStickerId).toBe(sticker.id);
  });

  it('returns null for unknown svgId', () => {
    const sticker = addStickerToStore('nonexistent');
    const { container } = renderSticker(sticker);
    expect(container.querySelector('.cover-sticker')).toBeNull();
  });

  it('selects sticker on pointerdown', () => {
    const sticker = addStickerToStore('star');
    renderSticker(sticker);
    const el = screen.getByRole('button');
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 200, clientY: 300 }));
    expect(useCoverStore.getState().selectedStickerId).toBe(sticker.id);
  });

  describe('keyboard navigation', () => {
    it('ArrowRight moves sticker right by 2% — calls moveSticker', () => {
      const sticker = addStickerToStore('star', { x: 50, y: 50 });
      const moveSpy = vi.spyOn(useCoverStore.getState(), 'moveSticker');
      renderSticker(sticker);
      const el = screen.getByRole('button');
      el.focus();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(moveSpy).toHaveBeenCalledWith(sticker.id, 52, 50);
      moveSpy.mockRestore();
    });

    it('ArrowLeft moves sticker left by 2%', () => {
      const sticker = addStickerToStore('star', { x: 50, y: 50 });
      const moveSpy = vi.spyOn(useCoverStore.getState(), 'moveSticker');
      renderSticker(sticker);
      const el = screen.getByRole('button');
      el.focus();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      expect(moveSpy).toHaveBeenCalledWith(sticker.id, 48, 50);
      moveSpy.mockRestore();
    });

    it('ArrowUp moves sticker up by 2%', () => {
      const sticker = addStickerToStore('star', { x: 50, y: 50 });
      const moveSpy = vi.spyOn(useCoverStore.getState(), 'moveSticker');
      renderSticker(sticker);
      const el = screen.getByRole('button');
      el.focus();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      expect(moveSpy).toHaveBeenCalledWith(sticker.id, 50, 48);
      moveSpy.mockRestore();
    });

    it('ArrowDown moves sticker down by 2%', () => {
      const sticker = addStickerToStore('star', { x: 50, y: 50 });
      const moveSpy = vi.spyOn(useCoverStore.getState(), 'moveSticker');
      renderSticker(sticker);
      const el = screen.getByRole('button');
      el.focus();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(moveSpy).toHaveBeenCalledWith(sticker.id, 50, 52);
      moveSpy.mockRestore();
    });

    it('Shift+ArrowRight moves by 10%', () => {
      const sticker = addStickerToStore('star', { x: 50, y: 50 });
      const moveSpy = vi.spyOn(useCoverStore.getState(), 'moveSticker');
      renderSticker(sticker);
      const el = screen.getByRole('button');
      el.focus();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }));
      expect(moveSpy).toHaveBeenCalledWith(sticker.id, 60, 50);
      moveSpy.mockRestore();
    });

    it('Delete key removes sticker', () => {
      const sticker = addStickerToStore('star');
      const removeSpy = vi.spyOn(useCoverStore.getState(), 'removeSticker');
      renderSticker(sticker);
      const el = screen.getByRole('button');
      el.focus();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
      expect(removeSpy).toHaveBeenCalledWith(sticker.id);
      removeSpy.mockRestore();
    });

    it('Backspace key removes sticker', () => {
      const sticker = addStickerToStore('star');
      const removeSpy = vi.spyOn(useCoverStore.getState(), 'removeSticker');
      renderSticker(sticker);
      const el = screen.getByRole('button');
      el.focus();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
      expect(removeSpy).toHaveBeenCalledWith(sticker.id);
      removeSpy.mockRestore();
    });

    it('Escape key deselects sticker', () => {
      const sticker = addStickerToStore('star');
      useCoverStore.getState().selectSticker(sticker.id);
      renderSticker(sticker);
      const el = screen.getByRole('button');
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(useCoverStore.getState().selectedStickerId).toBeNull();
    });
  });

  describe('double-click', () => {
    it('double-click calls removeSticker', () => {
      const sticker = addStickerToStore('star');
      const removeSpy = vi.spyOn(useCoverStore.getState(), 'removeSticker');
      renderSticker(sticker);
      const el = screen.getByRole('button');
      el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(removeSpy).toHaveBeenCalledWith(sticker.id);
      removeSpy.mockRestore();
    });
  });
});
