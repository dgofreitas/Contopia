// Contopia — Sort Books Utility Tests (STORY-035, STORY-036)
import { describe, it, expect } from 'vitest';
import { stripArticle, sortByAlphabetical, sortByRecentlyRead, sortByFavorites, sortBooks } from '../lib/sort-books';

describe('stripArticle', () => {
  // Positive: English articles stripped
  it('strips leading "The " (case-insensitive)', () => {
    expect(stripArticle('The Cat')).toBe('Cat');
  });

  it('strips leading "A " (English)', () => {
    expect(stripArticle('A Tale of Two Cities')).toBe('Tale of Two Cities');
  });

  it('strips leading "An "', () => {
    expect(stripArticle('An Apple Story')).toBe('Apple Story');
  });

  // Positive: Portuguese articles stripped
  it('strips leading "O " (Portuguese)', () => {
    expect(stripArticle('O Príncipe')).toBe('Príncipe');
  });

  it('strips leading "A " (Portuguese feminine)', () => {
    expect(stripArticle('A Menina que Roubava Livros')).toBe('Menina que Roubava Livros');
  });

  it('strips leading "As " (Portuguese plural feminine)', () => {
    expect(stripArticle('As Aventuras de João')).toBe('Aventuras de João');
  });

  it('strips leading "Os " (Portuguese plural masculine)', () => {
    expect(stripArticle('Os Lusíadas')).toBe('Lusíadas');
  });

  // Negative: no false positive
  it('does NOT strip "A" from "Ana" — no trailing space', () => {
    expect(stripArticle('Ana')).toBe('Ana');
  });

  it('does NOT strip "O" from "Oscar" — no trailing space', () => {
    expect(stripArticle('Oscar')).toBe('Oscar');
  });

  it('does NOT strip "As" from "Astro" — no trailing space', () => {
    expect(stripArticle('Astro')).toBe('Astro');
  });

  it('does NOT strip "Os" from "Ostra" — no trailing space', () => {
    expect(stripArticle('Ostra')).toBe('Ostra');
  });

  it('does NOT strip "An" from "Anatomia" — no trailing space', () => {
    expect(stripArticle('Anatomia')).toBe('Anatomia');
  });

  // Edge cases
  it('handles null/undefined title', () => {
    expect(stripArticle(null)).toBe('');
    expect(stripArticle(undefined)).toBe('');
  });

  it('handles empty string', () => {
    expect(stripArticle('')).toBe('');
  });

  it('handles title that is only an article', () => {
    expect(stripArticle('The')).toBe('The');
  });

  it('trims final result, so leading spaces are removed even if article not matched', () => {
    // Leading spaces prevent ^ anchored regex match, but .trim() at end still cleans up
    expect(stripArticle('  The Cat')).toBe('The Cat');
  });

  it('strips article case-insensitively', () => {
    expect(stripArticle('the little mermaid')).toBe('little mermaid');
    expect(stripArticle('o pequeno principe')).toBe('pequeno principe');
  });

  it('preserves mid-title articles', () => {
    expect(stripArticle('The Cat in the Hat')).toBe('Cat in the Hat');
  });
});

describe('sortByAlphabetical', () => {
  it('sorts English titles A→Z ignoring "The"', () => {
    const books = [
      { _id: '1', title: 'The Cat' },
      { _id: '2', title: 'Apple' },
      { _id: '3', title: 'Bear' },
    ];
    const sorted = sortByAlphabetical(books);
    expect(sorted.map((b) => b.title)).toEqual(['Apple', 'Bear', 'The Cat']);
  });

  it('sorts Portuguese titles ignoring "O" and "A"', () => {
    const books = [
      { _id: '1', title: 'O Príncipe' },
      { _id: '2', title: 'A Menina' },
      { _id: '3', title: 'Zebra' },
      { _id: '4', title: 'Bola' },
    ];
    const sorted = sortByAlphabetical(books);
    // Stripped: "Menina" → B, "Príncipe" → P, Z, B
    // Sorted: Bola, Menina, Príncipe, Zebra
    expect(sorted.map((b) => b.title)).toEqual(['Bola', 'A Menina', 'O Príncipe', 'Zebra']);
  });

  it('is accent-insensitive (sensitivity: base)', () => {
    const books = [
      { _id: '1', title: 'Árvore' },
      { _id: '2', title: 'Arroz' },
    ];
    const sorted = sortByAlphabetical(books);
    expect(sorted[0].title).toBe('Arroz');
    expect(sorted[1].title).toBe('Árvore');
  });

  it('returns a new array, does not mutate original', () => {
    const books = [
      { _id: '2', title: 'Beta' },
      { _id: '1', title: 'Alpha' },
    ];
    const original = [...books];
    const sorted = sortByAlphabetical(books);
    expect(sorted).not.toBe(books);
    expect(books).toEqual(original);
  });

  it('handles empty array', () => {
    expect(sortByAlphabetical([])).toEqual([]);
  });

  it('handles single book', () => {
    const books = [{ _id: '1', title: 'Solo' }];
    expect(sortByAlphabetical(books)).toEqual(books);
  });

  it('handles books with null/empty titles', () => {
    const books = [
      { _id: '1', title: null },
      { _id: '2', title: 'Alpha' },
      { _id: '3', title: '' },
    ];
    // Should not throw; empty titles sort first
    const sorted = sortByAlphabetical(books);
    expect(sorted).toHaveLength(3);
  });
});

describe('sortByRecentlyRead', () => {
  it('sorts books with progress by updatedAt DESC (most recent first)', () => {
    const books = [
      { _id: '1', title: 'Old Read', createdAt: '2024-01-01' },
      { _id: '2', title: 'Recent Read', createdAt: '2024-01-02' },
      { _id: '3', title: 'Never Read', createdAt: '2024-01-03' },
    ];
    const progressMap = {
      '1': { percentage: 100, finished: true, updatedAt: '2024-06-01' },
      '2': { percentage: 50, finished: false, updatedAt: '2024-06-15' },
    };
    const sorted = sortByRecentlyRead(books, progressMap);
    // 2 (recently read) → 1 (read earlier) → 3 (never read, by createdAt DESC)
    expect(sorted.map((b) => b._id)).toEqual(['2', '1', '3']);
  });

  it('places books with progress before books without progress', () => {
    const books = [
      { _id: '1', title: 'Has Progress', createdAt: '2024-01-01' },
      { _id: '2', title: 'No Progress', createdAt: '2024-06-01' },
    ];
    const progressMap = {
      '1': { percentage: 10, finished: false, updatedAt: '2024-03-01' },
    };
    const sorted = sortByRecentlyRead(books, progressMap);
    expect(sorted.map((b) => b._id)).toEqual(['1', '2']);
  });

  it('falls back to createdAt DESC when progressMap is empty', () => {
    const books = [
      { _id: '1', title: 'Oldest', createdAt: '2024-01-01' },
      { _id: '2', title: 'Newest', createdAt: '2024-06-01' },
      { _id: '3', title: 'Middle', createdAt: '2024-03-01' },
    ];
    const sorted = sortByRecentlyRead(books, {});
    expect(sorted.map((b) => b._id)).toEqual(['2', '3', '1']);
  });

  it('falls back to createdAt DESC when progressMap is undefined', () => {
    const books = [
      { _id: '3', title: 'Oldest', createdAt: '2024-01-01' },
      { _id: '1', title: 'Newest', createdAt: '2024-06-01' },
    ];
    const sorted = sortByRecentlyRead(books, undefined);
    expect(sorted.map((b) => b._id)).toEqual(['1', '3']);
  });

  it('handles books without createdAt (falls to 0)', () => {
    const books = [
      { _id: '1', title: 'No Date' },
      { _id: '2', title: 'With Date', createdAt: '2024-06-01' },
    ];
    const sorted = sortByRecentlyRead(books, {});
    expect(sorted.map((b) => b._id)).toEqual(['2', '1']);
  });

  it('handles empty books array', () => {
    expect(sortByRecentlyRead([], {})).toEqual([]);
  });

  it('handles single book without progress', () => {
    const books = [{ _id: '1', title: 'Solo', createdAt: '2024-01-01' }];
    expect(sortByRecentlyRead(books, {})).toEqual(books);
  });

  it('handles single book with progress', () => {
    const books = [{ _id: '1', title: 'Solo', createdAt: '2024-01-01' }];
    const progressMap = { '1': { percentage: 100, finished: true, updatedAt: '2024-06-01' } };
    expect(sortByRecentlyRead(books, progressMap)).toEqual(books);
  });

  it('returns a new array, does not mutate original', () => {
    const books = [
      { _id: '2', title: 'B', createdAt: '2024-01-01' },
      { _id: '1', title: 'A', createdAt: '2024-06-01' },
    ];
    const original = [...books];
    const sorted = sortByRecentlyRead(books, {});
    expect(sorted).not.toBe(books);
    expect(books).toEqual(original);
  });

  it('uses progress.updatedAt as date — handles ISO string', () => {
    const books = [
      { _id: '1', title: 'A', createdAt: '2024-01-01' },
      { _id: '2', title: 'B', createdAt: '2024-01-01' },
    ];
    const progressMap = {
      '1': { percentage: 100, finished: true, updatedAt: '2024-06-01T12:00:00Z' },
      '2': { percentage: 100, finished: true, updatedAt: '2024-06-02T12:00:00Z' },
    };
    const sorted = sortByRecentlyRead(books, progressMap);
    expect(sorted.map((b) => b._id)).toEqual(['2', '1']);
  });
});

describe('sortByFavorites (STORY-036)', () => {
  it('sorts favorited books before unfavorited', () => {
    const books = [
      { _id: '1', title: 'A', isFavorited: false },
      { _id: '2', title: 'B', isFavorited: true },
      { _id: '3', title: 'C', isFavorited: false },
    ];
    const sorted = sortByFavorites(books);
    expect(sorted.map((b) => b._id)).toEqual(['2', '1', '3']);
  });

  it('preserves relative order among favorited books', () => {
    const books = [
      { _id: '1', title: 'A', isFavorited: true },
      { _id: '2', title: 'B', isFavorited: false },
      { _id: '3', title: 'C', isFavorited: true },
    ];
    const sorted = sortByFavorites(books);
    expect(sorted.map((b) => b._id)).toEqual(['1', '3', '2']);
  });

  it('returns same order when all books favorited', () => {
    const books = [
      { _id: '1', title: 'A', isFavorited: true },
      { _id: '2', title: 'B', isFavorited: true },
    ];
    const sorted = sortByFavorites(books);
    expect(sorted.map((b) => b._id)).toEqual(['1', '2']);
  });

  it('returns same order when no books favorited', () => {
    const books = [
      { _id: '1', title: 'A', isFavorited: false },
      { _id: '2', title: 'B', isFavorited: false },
    ];
    const sorted = sortByFavorites(books);
    expect(sorted.map((b) => b._id)).toEqual(['1', '2']);
  });

  it('handles empty array', () => {
    expect(sortByFavorites([])).toEqual([]);
  });

  it('handles single book favorited', () => {
    const books = [{ _id: '1', title: 'Solo', isFavorited: true }];
    expect(sortByFavorites(books)).toEqual(books);
  });

  it('returns a new array, does not mutate original', () => {
    const books = [
      { _id: '2', title: 'B', isFavorited: false },
      { _id: '1', title: 'A', isFavorited: true },
    ];
    const original = [...books];
    const sorted = sortByFavorites(books);
    expect(sorted).not.toBe(books);
    expect(books).toEqual(original);
  });
});

describe('sortBooks dispatcher', () => {
  const books = [
    { _id: '3', title: 'The Cat', createdAt: '2024-01-01' },
    { _id: '1', title: 'Apple', createdAt: '2024-06-01' },
    { _id: '2', title: 'Bear', createdAt: '2024-03-01' },
  ];

  it('dispatches to sortByAlphabetical when sortMode is "alphabetical"', () => {
    const sorted = sortBooks(books, 'alphabetical', {});
    expect(sorted.map((b) => b.title)).toEqual(['Apple', 'Bear', 'The Cat']);
  });

  it('dispatches to sortByRecentlyRead when sortMode is "recently-read"', () => {
    const sorted = sortBooks(books, 'recently-read', {});
    expect(sorted.map((b) => b._id)).toEqual(['1', '2', '3']);
  });

  it('dispatches to sortByFavorites when sortMode is "favorites"', () => {
    const favBooks = [
      { _id: '1', title: 'B', isFavorited: false },
      { _id: '2', title: 'A', isFavorited: true },
    ];
    const sorted = sortBooks(favBooks, 'favorites', {});
    expect(sorted.map((b) => b._id)).toEqual(['2', '1']);
  });

  it('returns books unchanged for default/unknown mode', () => {
    const sorted = sortBooks(books, 'unknown-mode', {});
    expect(sorted).toEqual(books);
  });

  it('handles null/undefined books', () => {
    expect(sortBooks(null, 'alphabetical', {})).toEqual([]);
    expect(sortBooks(undefined, 'alphabetical', {})).toEqual([]);
  });

  it('handles empty books array', () => {
    expect(sortBooks([], 'alphabetical', {})).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const original = [...books];
    sortBooks(books, 'alphabetical', {});
    expect(books).toEqual(original);
  });
});
