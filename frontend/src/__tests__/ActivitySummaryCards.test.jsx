import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivitySummaryCards from '../components/parent/ActivitySummaryCards';

describe('ActivitySummaryCards', () => {
  it('renders all three metric cards with values', () => {
    render(
      <ActivitySummaryCards
        booksWritten={5}
        booksRead={3}
        readingTimeMinutes={45}
        childFirstName="Julia"
      />
    );

    expect(screen.getByText('Livros Escritos')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Livros Lidos')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Tempo de Leitura')).toBeInTheDocument();
    expect(screen.getByText('45 minutos')).toBeInTheDocument();
  });

  it('renders zero values gracefully', () => {
    render(
      <ActivitySummaryCards
        booksWritten={0}
        booksRead={0}
        readingTimeMinutes={0}
        childFirstName="Carlos"
      />
    );

    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });

  it('has accessible label with child name', () => {
    render(
      <ActivitySummaryCards
        booksWritten={2}
        booksRead={1}
        readingTimeMinutes={10}
        childFirstName="Ana"
      />
    );

    expect(screen.getByLabelText('Ana activity metrics')).toBeInTheDocument();
  });
});