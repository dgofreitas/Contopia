import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrivacyNoticeBanner from '../components/parent/PrivacyNoticeBanner';

describe('PrivacyNoticeBanner', () => {
  it('renders privacy notice with child name', () => {
    render(<PrivacyNoticeBanner childFirstName="Julia" />);

    expect(screen.getByText(/As histórias da Julia são privadas/)).toBeInTheDocument();
  });

  it('renders privacy notice with fallback when no name', () => {
    render(<PrivacyNoticeBanner childFirstName="" />);

    expect(screen.getByText(/As histórias da criança são privadas/)).toBeInTheDocument();
  });

  it('has accessible role', () => {
    render(<PrivacyNoticeBanner childFirstName="Julia" />);

    expect(screen.getByRole('note')).toBeInTheDocument();
  });

  it('contains expected Portuguese text', () => {
    render(<PrivacyNoticeBanner childFirstName="Julia" />);

    expect(screen.getByText(/Apenas títulos e tempo de leitura são mostrados aqui/)).toBeInTheDocument();
  });
});