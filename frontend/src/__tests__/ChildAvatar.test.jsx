import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChildAvatar from '../components/parent/ChildAvatar';

describe('ChildAvatar', () => {
  it('renders the first letter of firstName as initial', () => {
    render(<ChildAvatar firstName="Julia" avatarSeed="c1" />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders "?" when firstName is empty', () => {
    render(<ChildAvatar firstName="" avatarSeed="c2" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('has role="img" and correct aria-label', () => {
    render(<ChildAvatar firstName="Carlos" avatarSeed="c3" />);
    const avatar = screen.getByRole('img');
    expect(avatar).toHaveAttribute('aria-label', "Carlos's avatar");
    expect(avatar).toHaveAttribute('title', "Carlos's avatar");
  });

  it('produces deterministic color for the same avatarSeed', () => {
    const { container: container1 } = render(<ChildAvatar firstName="A" avatarSeed="seed-x" />);
    const classList1 = container1.querySelector('[role="img"]').className;

    const { container: container2 } = render(<ChildAvatar firstName="B" avatarSeed="seed-x" />);
    const classList2 = container2.querySelector('[role="img"]').className;

    expect(classList1).toBe(classList2);
  });

  it('produces different colors for different avatarSeed values', () => {
    const { container: container1 } = render(<ChildAvatar firstName="A" avatarSeed="seed-1" />);
    const colorClass1 = container1.querySelector('[role="img"]').className;

    const { container: container2 } = render(<ChildAvatar firstName="A" avatarSeed="seed-2" />);
    const colorClass2 = container2.querySelector('[role="img"]').className;

    expect(colorClass1).not.toBe(colorClass2);
  });

  it('applies size classes based on size prop', () => {
    const { container: small } = render(<ChildAvatar firstName="A" avatarSeed="s" size={28} />);
    expect(small.querySelector('[role="img"]').className).toContain('w-8 h-8');

    const { container: medium } = render(<ChildAvatar firstName="A" avatarSeed="s" size={40} />);
    expect(medium.querySelector('[role="img"]').className).toContain('w-10 h-10');

    const { container: large } = render(<ChildAvatar firstName="A" avatarSeed="s" size={56} />);
    expect(large.querySelector('[role="img"]').className).toContain('w-14 h-14');
  });

  it('renders as a rounded circle', () => {
    const { container } = render(<ChildAvatar firstName="Julia" avatarSeed="c1" />);
    const el = container.querySelector('[role="img"]');
    expect(el.className).toContain('rounded-full');
  });
});