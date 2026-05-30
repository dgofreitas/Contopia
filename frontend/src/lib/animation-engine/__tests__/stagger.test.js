import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../animate.js', () => ({
  animate: vi.fn(() => ({
    cancel: vi.fn(),
    onComplete: vi.fn(),
  })),
}));

import { stagger } from '../stagger.js';
import { animate } from '../animate.js';

describe('stagger', () => {
  let elements;

  beforeEach(() => {
    vi.clearAllMocks();
    elements = [
      { style: {} },
      { style: {} },
      { style: {} },
    ];
  });

  it('calls animate immediately for first element and delays rest', () => {
    vi.useFakeTimers();

    stagger(elements, {
      to: { opacity: 1 },
      duration: 300,
      easing: 'easeOut',
    });

    expect(animate).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(50);
    expect(animate).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(50);
    expect(animate).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it('passes animate options to each element', () => {
    stagger(elements, {
      to: { opacity: 1 },
      duration: 300,
      easing: 'easeOut',
      perElement: 0,
    });

    expect(animate).toHaveBeenCalledTimes(3);
    elements.forEach((el, index) => {
      expect(animate).toHaveBeenCalledWith(el, expect.objectContaining({
        to: { opacity: 1 },
        duration: 300,
        easing: 'easeOut',
      }));
    });
  });

  it('returns an array of handles', () => {
    const handles = stagger(elements, {
      to: { opacity: 1 },
      duration: 300,
    });

    expect(handles).toHaveLength(3);
    handles.forEach((handle) => {
      expect(handle).toBeDefined();
    });
  });

  it('delays subsequent elements by perElement ms', () => {
    vi.useFakeTimers();

    stagger(elements, {
      to: { opacity: 1 },
      duration: 300,
      perElement: 100,
    });

    expect(animate).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(animate).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(100);
    expect(animate).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it('uses default perElement of 50ms when not specified', () => {
    vi.useFakeTimers();

    stagger(elements, {
      to: { opacity: 1 },
      duration: 300,
    });

    expect(animate).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(50);
    expect(animate).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});